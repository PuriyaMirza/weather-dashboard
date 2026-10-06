import { z } from 'zod';
import { fetchJson } from '@/lib/api/http';
import { withTimeout } from '@/lib/api/request-timeout';
import { ebirdObservationSchema, type EbirdObservation } from './schemas';

const EBIRD = 'https://api.ebird.org/v2';
const PARK_CENTER = { lat: 40.7812, lng: -73.9665 };
// The geo endpoints take a radius; 3 km reaches both ends of the park. Neighbouring street
// hotspots are then dropped by name, so a bird on Fifth Avenue doesn't count as "in the park".
const RADIUS_KM = 3;
const PARK_NAME = 'Central Park';

/** One species reported in the park recently — the only shape the sightings UI sees. */
export interface ParkSighting {
  speciesCode: string;
  commonName: string;
  scientificName: string;
  /** Area within the park ("The Ramble"), or "Central Park" for the park-wide hotspot. */
  area: string;
  /** "YYYY-MM-DD HH:mm" local time, or "YYYY-MM-DD" when the observer gave no time. */
  observedAt: string;
  /** Null for "X" — present, not counted. */
  count: number | null;
  /** eBird flagged it as rare for the date and place. */
  notable: boolean;
  /** Notable reports a reviewer has not yet confirmed. */
  unconfirmed: boolean;
  checklistUrl: string;
}

export interface SightingsResponse {
  fetchedAt: string;
  days: number;
  sightings: ParkSighting[];
}

export function isInPark(locName: string): boolean {
  return locName === PARK_NAME || locName.startsWith(`${PARK_NAME}--`) || locName.startsWith(`${PARK_NAME} `);
}

export function parkArea(locName: string): string {
  return locName.startsWith(`${PARK_NAME}--`) ? locName.slice(PARK_NAME.length + 2) : PARK_NAME;
}

/**
 * True for a real species. eBird also reports hybrids ("Mallard x American Black Duck"), spuhs
 * ("warbler sp.") and slashes ("Greater/Lesser Scaup") — valid records, but not a bird the guide
 * or a life list can name.
 */
export function isSpecies(obs: Pick<EbirdObservation, 'speciesCode' | 'comName'>): boolean {
  return !/^x\d/.test(obs.speciesCode) && !/ sp\.|\/| x /.test(obs.comName) && !obs.comName.includes('(hybrid)');
}

/**
 * Merges "recent" (latest report of every species) with "notable" (every report of a rare one)
 * into one row per species, rare birds first, then newest first.
 */
export function toParkSightings(recent: EbirdObservation[], notable: EbirdObservation[]): ParkSighting[] {
  const inPark = (o: EbirdObservation) => isInPark(o.locName) && !o.locationPrivate && isSpecies(o);
  const notableBySpecies = new Map<string, EbirdObservation>();
  for (const obs of notable.filter(inPark)) {
    const current = notableBySpecies.get(obs.speciesCode);
    if (!current || obs.obsDt > current.obsDt) notableBySpecies.set(obs.speciesCode, obs);
  }
  const bySpecies = new Map<string, EbirdObservation>();
  for (const obs of [...recent.filter(inPark), ...notableBySpecies.values()]) {
    const current = bySpecies.get(obs.speciesCode);
    if (!current || obs.obsDt > current.obsDt) bySpecies.set(obs.speciesCode, obs);
  }
  return [...bySpecies.values()]
    .map((obs) => {
      const rare = notableBySpecies.get(obs.speciesCode);
      return {
        speciesCode: obs.speciesCode,
        commonName: obs.comName,
        scientificName: obs.sciName,
        area: parkArea(obs.locName),
        observedAt: obs.obsDt,
        count: obs.howMany ?? null,
        notable: rare !== undefined,
        unconfirmed: rare !== undefined && !rare.obsReviewed,
        checklistUrl: `https://ebird.org/checklist/${obs.subId}`,
      };
    })
    .sort((a, b) => Number(b.notable) - Number(a.notable) || b.observedAt.localeCompare(a.observedAt));
}

function geoUrl(path: string, days: number): string {
  const url = new URL(`${EBIRD}${path}`);
  url.searchParams.set('lat', String(PARK_CENTER.lat));
  url.searchParams.set('lng', String(PARK_CENTER.lng));
  url.searchParams.set('dist', String(RADIUS_KM));
  url.searchParams.set('back', String(days));
  url.searchParams.set('includeProvisional', 'true');
  url.searchParams.set('maxResults', '10000');
  return url.toString();
}

/** Both eBird calls, in parallel; either failing fails the whole request (both are core here). */
export async function fetchParkSightings(apiKey: string, days: number, fetchImpl: typeof fetch = fetch): Promise<ParkSighting[]> {
  const parse = (json: unknown) => z.array(ebirdObservationSchema).safeParse(json);
  const init = () => ({ ...withTimeout(), headers: { 'X-eBirdApiToken': apiKey } });
  const [recent, notable] = await Promise.all([
    fetchJson(geoUrl('/data/obs/geo/recent', days), parse, init(), fetchImpl),
    fetchJson(`${geoUrl('/data/obs/geo/recent/notable', days)}&detail=simple`, parse, init(), fetchImpl),
  ]);
  return toParkSightings(recent, notable);
}
