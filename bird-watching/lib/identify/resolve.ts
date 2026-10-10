import { z } from 'zod';
import { fetchJson } from '@/lib/api/http';
import { withTimeout } from '@/lib/api/request-timeout';
import { getAllSpecies } from '@/lib/birds/species';
import { getSpeciesPhoto, type SpeciesPhoto } from '@/lib/media/wikipedia';
import type { CandidatePhoto, ClaudeOutput, IdentifyResponse } from './schema';

/*
  Turns the model's answer into a log-ready record without trusting it for anything it could
  invent: species codes come from eBird's taxonomy (matched on scientific name, then common name),
  coordinates from Open-Meteo's geocoder. A name that matches nothing keeps a null code — the log
  accepts that — rather than a guessed one.
*/

export interface TaxonEntry {
  code: string;
  commonName: string;
  scientificName: string;
}

const norm = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
/** "Pandion haliaetus carolinensis" → "pandion haliaetus": subspecies still find their species. */
const binomial = (name: string) => norm(name).split(' ').slice(0, 2).join(' ');

export function buildTaxonIndex(entries: TaxonEntry[]) {
  const bySci = new Map<string, TaxonEntry>();
  const byCommon = new Map<string, TaxonEntry>();
  for (const entry of entries) {
    bySci.set(binomial(entry.scientificName), entry);
    byCommon.set(norm(entry.commonName), entry);
  }
  return (commonName: string, scientificName: string) =>
    bySci.get(binomial(scientificName)) ?? byCommon.get(norm(commonName));
}

const taxonomySchema = z.array(z.object({ speciesCode: z.string(), comName: z.string(), sciName: z.string() }));

let taxonomy: Promise<TaxonEntry[]> | null = null;

/**
 * Every species eBird knows (~11k), fetched once per server instance. The guide's own list answers
 * first, so park birds resolve even if eBird is unreachable; a failed fetch is forgotten so the
 * next photo retries it.
 */
async function loadTaxonomy(apiKey: string | undefined, fetchImpl: typeof fetch): Promise<TaxonEntry[]> {
  const guide = getAllSpecies().map((s) => ({ code: s.code, commonName: s.commonName, scientificName: s.scientificName }));
  if (!apiKey) return guide;
  taxonomy ??= fetchJson(
    'https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&cat=species',
    (json) => taxonomySchema.safeParse(json),
    { ...withTimeout(), headers: { 'X-eBirdApiToken': apiKey } },
    fetchImpl,
  ).then((rows) => rows.map((r) => ({ code: r.speciesCode, commonName: r.comName, scientificName: r.sciName })));
  try {
    // Guide entries go last so they win over eBird's for the same key (identical in practice).
    return [...(await taxonomy), ...guide];
  } catch (error) {
    taxonomy = null;
    console.error('[identify] eBird taxonomy unavailable:', error instanceof Error ? error.message : error);
    return guide;
  }
}

const geocodeSchema = z.object({
  results: z
    .array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number(), admin1: z.string().optional(), country_code: z.string().optional() }))
    .optional(),
});

/** Best single match for a named place; null on no match or any failure (the map point is optional). */
export async function geocode(name: string, countryCode: string | null, fetchImpl: typeof fetch = fetch) {
  const params = new URLSearchParams({ name, count: '1', language: 'en', format: 'json' });
  if (countryCode && /^[A-Za-z]{2}$/.test(countryCode)) params.set('countryCode', countryCode.toUpperCase());
  try {
    const { results } = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`,
      (json) => geocodeSchema.safeParse(json),
      withTimeout(),
      fetchImpl,
    );
    const hit = results?.[0];
    if (!hit) return null;
    return {
      latitude: hit.latitude,
      longitude: hit.longitude,
      label: [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(', '),
    };
  } catch {
    return null;
  }
}

/** A reference photo must never hold up the ID: past this, the candidate just shows no photo. */
const PHOTO_DEADLINE_MS = 4_000;

async function photoWithin(getPhoto: (sci: string) => Promise<SpeciesPhoto | null>, scientificName: string): Promise<CandidatePhoto | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), PHOTO_DEADLINE_MS)));
  const photo = await Promise.race([getPhoto(scientificName).catch(() => null), timeout]);
  clearTimeout(timer);
  if (!photo) return null;
  const { src, width, height, artist, license, licenseUrl, sourceUrl } = photo;
  return { src, width, height, artist, license, licenseUrl, sourceUrl };
}

const validDate = (date: string | null) => (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : null);
const validTime = (time: string | null) => (time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null);

export async function resolveIdentification(
  output: ClaudeOutput,
  {
    ebirdApiKey,
    fetchImpl = fetch,
    getPhoto = getSpeciesPhoto,
  }: { ebirdApiKey: string | undefined; fetchImpl?: typeof fetch; getPhoto?: (scientificName: string) => Promise<SpeciesPhoto | null> },
): Promise<IdentifyResponse> {
  const { place } = output;
  // Park areas export at the park's own hotspot; only places elsewhere need a map point.
  const pointPromise = !place.parkArea && place.name ? geocode(place.name, place.countryCode, fetchImpl) : Promise.resolve(null);
  const lookup = buildTaxonIndex(await loadTaxonomy(ebirdApiKey, fetchImpl));

  const resolved = output.candidates.slice(0, 3).map((c) => {
    const match = lookup(c.commonName, c.scientificName);
    return {
      speciesCode: match?.code ?? null,
      commonName: match?.commonName ?? c.commonName,
      scientificName: match?.scientificName ?? c.scientificName,
      confidence: c.confidence,
      fieldMarks: c.fieldMarks,
    };
  });
  // Looked up by the resolved scientific name, the same key the field guide's photos use.
  const [point, photos] = await Promise.all([pointPromise, Promise.all(resolved.map((c) => photoWithin(getPhoto, c.scientificName)))]);

  return {
    candidates: resolved.map((c, i) => ({ ...c, photo: photos[i] })),
    date: validDate(output.date),
    time: validTime(output.time),
    place: {
      name: place.name,
      parkArea: place.parkArea,
      stateCode: place.stateCode?.toUpperCase() ?? null,
      countryCode: place.countryCode?.toUpperCase() ?? null,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
      mapLabel: point?.label ?? null,
    },
    count: output.count !== null && output.count >= 1 ? output.count : null,
  };
}

/** Test hook: forget the memoized taxonomy. */
export function resetTaxonomyCache() {
  taxonomy = null;
}
