import type { Observation, Outing } from './schema';

export interface ListEntry {
  /** Species code, or the typed name for a species outside the guide. */
  key: string;
  speciesCode: string | null;
  commonName: string;
  /** First sighting: when and where. */
  firstSeen: string;
  firstArea: string;
  /** How many outings it was recorded on. */
  outings: number;
}

/**
 * Builds a species list from the log: one entry per species, with the first time it was seen.
 * `year` limits it to outings started in that calendar year (a year list); omit for a life list.
 */
export function buildSpeciesList(outings: Outing[], observations: Observation[], year?: number): ListEntry[] {
  const outingById = new Map(outings.map((o) => [o.id, o]));
  const entries = new Map<string, ListEntry>();
  for (const obs of observations) {
    const outing = outingById.get(obs.outingId);
    if (!outing) continue;
    if (year !== undefined && Number(outing.startTime.slice(0, 4)) !== year) continue;
    const key = obs.speciesCode ?? obs.commonName.trim().toLowerCase();
    const existing = entries.get(key);
    if (!existing) {
      entries.set(key, {
        key,
        speciesCode: obs.speciesCode,
        commonName: obs.commonName,
        firstSeen: outing.startTime,
        firstArea: outing.area,
        outings: 1,
      });
      continue;
    }
    existing.outings += 1;
    if (outing.startTime < existing.firstSeen) {
      existing.firstSeen = outing.startTime;
      existing.firstArea = outing.area;
    }
  }
  return [...entries.values()].sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
}
