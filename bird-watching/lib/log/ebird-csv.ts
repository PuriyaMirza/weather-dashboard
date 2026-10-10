import { breedingCodeLabel } from './breeding-codes';
import { PARK_CENTER, ebirdLocationName, isParkArea } from './park-areas';
import type { Observation, Outing } from './schema';

/*
  eBird Record Format (Extended): 19 columns, one row per species per checklist, no header row.
  Upload at https://ebird.org/import/upload.form with format "eBird Record Format (Extended)".

   1 Common Name          8 Longitude            15 Duration (minutes)
   2 Genus                9 Date (MM/DD/YYYY)    16 All observations reported? (Y/N)
   3 Species             10 Start Time (HH:MM)   17 Effort Distance Miles
   4 Number (or X)       11 State/Province       18 Effort area acres
   5 Species Comments    12 Country Code         19 Submission Comments
   6 Location Name       13 Protocol
   7 Latitude            14 Number of Observers
*/

const PROTOCOL_NAME: Record<Outing['protocol'], string> = {
  traveling: 'traveling',
  stationary: 'stationary',
  incidental: 'incidental',
};

/** Quotes a field only when it needs it; doubles embedded quotes, per RFC 4180. */
export function csvField(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function speciesComments(observation: Observation): string {
  // The record format has no breeding-code column, so the code travels in the comments where
  // a reviewer (or you, editing after import) can see it.
  const label = observation.breedingCode ? breedingCodeLabel(observation.breedingCode) : undefined;
  const breeding = observation.breedingCode ? `Breeding code ${observation.breedingCode}${label ? ` (${label})` : ''}.` : '';
  return [breeding, observation.comments.trim()].filter(Boolean).join(' ');
}

export function outingRows(outing: Outing, observations: Observation[]): string[][] {
  const [date, time] = outing.startTime.split('T');
  const [year, month, day] = date.split('-');
  // Only a park area can fall back to the park's centre; a place elsewhere with no map point
  // exports blank coordinates and gets matched to a location during eBird's import.
  const fallback = isParkArea(outing.area) ? PARK_CENTER : null;
  const latitude = outing.latitude ?? fallback?.latitude ?? null;
  const longitude = outing.longitude ?? fallback?.longitude ?? null;
  return observations.map((obs) => {
    const [genus = '', ...rest] = (obs.scientificName ?? '').split(' ');
    return [
      obs.commonName,
      genus,
      rest.join(' '),
      obs.count === null ? 'X' : String(obs.count),
      speciesComments(obs),
      ebirdLocationName(outing.area),
      latitude === null ? '' : latitude.toFixed(5),
      longitude === null ? '' : longitude.toFixed(5),
      `${month}/${day}/${year}`,
      time,
      // Records from before places outside the park existed are all Central Park.
      outing.stateCode ?? (outing.countryCode ? '' : 'NY'),
      outing.countryCode ?? 'US',
      PROTOCOL_NAME[outing.protocol],
      String(outing.observers),
      outing.protocol === 'incidental' || outing.durationMin === null ? '' : String(outing.durationMin),
      outing.allReported ? 'Y' : 'N',
      outing.protocol === 'traveling' && outing.distanceMi !== null ? String(outing.distanceMi) : '',
      '',
      outing.comments.trim(),
    ].map(String);
  });
}

/** Builds the whole file. Outings with no observations are skipped — eBird needs one row per species. */
export function toEbirdCsv(outings: Outing[], observations: Observation[]): string {
  const byOuting = new Map<string, Observation[]>();
  for (const obs of observations) byOuting.set(obs.outingId, [...(byOuting.get(obs.outingId) ?? []), obs]);
  const rows = outings.flatMap((outing) => outingRows(outing, byOuting.get(outing.id) ?? []));
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n') + (rows.length ? '\r\n' : '');
}
