/**
 * Builds data/species.json — every species the field guide lists.
 *
 *   npm run data:species -- --offline   seed from data/species-content.json alone
 *   EBIRD_API_KEY=… npm run data:species  every species eBird has recorded in Central Park
 *
 * Online, the park list is the union of eBird's all-time species lists for every hotspot named
 * "Central Park…", joined to eBird taxonomy, with the hand-written content merged in by species
 * code. It also writes data/hotspots.json.
 *
 * The content file was written by hand, so its codes and scientific names can drift from eBird's
 * taxonomy (annual updates rename and split species). Online builds refuse to write anything
 * while any content entry disagrees with eBird, and list each disagreement to fix.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { speciesContentFileSchema, speciesFileSchema, type Species, type SpeciesContent } from '../lib/birds/schema.ts';
import {
  ebirdHotspotSchema,
  ebirdSpeciesListSchema,
  ebirdTaxonSchema,
  hotspotFileSchema,
  type EbirdTaxon,
} from '../lib/ebird/schemas.ts';

const ROOT = join(import.meta.dirname, '..');
const EBIRD = 'https://api.ebird.org/v2';

// Bethesda Terrace-ish: the middle of the park. 3 km reaches both ends (59th St to 110th St)
// while the "Central Park" name filter keeps neighbouring street hotspots out.
const PARK_CENTER = { lat: 40.7812, lng: -73.9665 };
const SEARCH_RADIUS_KM = 3;

function readContent(): SpeciesContent[] {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data/species-content.json'), 'utf8'));
  return speciesContentFileSchema.parse(raw);
}

function fromContent(content: SpeciesContent, taxonOrder: number): Species {
  return { ...content, taxonOrder, startHere: true };
}

function fromTaxon(taxon: EbirdTaxon, content: SpeciesContent | undefined): Species {
  const taxonomy = {
    code: taxon.speciesCode,
    commonName: taxon.comName,
    scientificName: taxon.sciName,
    bandingCode: taxon.bandingCodes[0] ?? null,
    family: taxon.familyComName ?? 'Unknown family',
    familyScientific: taxon.familySciName ?? 'Unknown',
    taxonOrder: taxon.taxonOrder,
  };
  if (content) return { ...content, ...taxonomy, startHere: true };
  return {
    ...taxonomy,
    startHere: false,
    lengthIn: null,
    colors: [],
    habitats: [],
    summary: null,
    idTips: [],
    lookAlikes: [],
    whereInPark: null,
    whenInPark: null,
    behavior: null,
    voice: null,
  };
}

async function ebirdGet<T>(path: string, schema: z.ZodType<T>, apiKey: string): Promise<T> {
  const response = await fetch(`${EBIRD}${path}`, { headers: { 'X-eBirdApiToken': apiKey } });
  if (!response.ok) throw new Error(`eBird ${path} → HTTP ${response.status}`);
  return schema.parse(await response.json());
}

function writeJson(relativePath: string, value: unknown) {
  writeFileSync(join(ROOT, relativePath), `${JSON.stringify(value, null, 2)}\n`);
  console.log(`wrote ${relativePath}`);
}

async function buildOnline(apiKey: string, content: SpeciesContent[]) {
  const nearby = await ebirdGet(
    `/ref/hotspot/geo?lat=${PARK_CENTER.lat}&lng=${PARK_CENTER.lng}&dist=${SEARCH_RADIUS_KM}&fmt=json`,
    z.array(ebirdHotspotSchema),
    apiKey,
  );
  const hotspots = nearby.filter((h) => h.locName.startsWith('Central Park'));
  if (hotspots.length === 0) throw new Error('No hotspot named "Central Park…" found near the park centre.');

  const parkCodes = new Set<string>();
  for (const hotspot of hotspots) {
    for (const code of await ebirdGet(`/product/spplist/${hotspot.locId}`, ebirdSpeciesListSchema, apiKey)) {
      parkCodes.add(code);
    }
  }

  const taxonomy = await ebirdGet('/ref/taxonomy/ebird?fmt=json&locale=en', z.array(ebirdTaxonSchema), apiKey);
  const byCode = new Map(taxonomy.map((t) => [t.speciesCode, t]));

  const problems: string[] = [];
  for (const entry of content) {
    const taxon = byCode.get(entry.code);
    if (!taxon) problems.push(`${entry.code} (${entry.commonName}): no such eBird species code`);
    else if (taxon.sciName !== entry.scientificName)
      problems.push(`${entry.code}: content says ${entry.scientificName}, eBird says ${taxon.sciName}`);
    else if (!parkCodes.has(entry.code)) console.warn(`note: ${entry.code} has never been reported at a Central Park hotspot`);
  }
  if (problems.length > 0) {
    console.error(`species-content.json disagrees with eBird taxonomy:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }

  const contentByCode = new Map(content.map((c) => [c.code, c]));
  const codes = new Set([...parkCodes, ...contentByCode.keys()]);
  const species = [...codes]
    .map((code) => byCode.get(code))
    // Spuhs, slashes and hybrids are valid checklist entries but not field-guide pages.
    .filter((taxon): taxon is EbirdTaxon => taxon?.category === 'species')
    .map((taxon) => fromTaxon(taxon, contentByCode.get(taxon.speciesCode)))
    .sort((a, b) => a.taxonOrder - b.taxonOrder);

  const generatedAt = new Date().toISOString();
  writeJson('data/species.json', speciesFileSchema.parse({ source: 'ebird', generatedAt, species }));
  writeJson('data/hotspots.json', hotspotFileSchema.parse({ generatedAt, hotspots }));
}

function buildOffline(content: SpeciesContent[]) {
  // The content file is kept in taxonomic sequence, so list position stands in for eBird's
  // taxonOrder until an online build supplies the real one.
  const species = content.map((entry, index) => fromContent(entry, index + 1));
  writeJson(
    'data/species.json',
    speciesFileSchema.parse({ source: 'seed', generatedAt: new Date().toISOString(), species }),
  );
}

const content = readContent();
const apiKey = process.env.EBIRD_API_KEY;

if (process.argv.includes('--offline')) {
  buildOffline(content);
} else if (!apiKey) {
  console.error('EBIRD_API_KEY is not set. Get one at https://ebird.org/api/keygen, or pass --offline.');
  process.exit(1);
} else {
  await buildOnline(apiKey, content);
}
