import { DEFAULT_AREA } from './park-areas';
import { nowIso } from './repository';
import type { Observation, Outing } from './schema';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Local wall-clock time as "YYYY-MM-DDTHH:mm", the format of <input type="datetime-local">. */
export function localDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A new traveling, complete checklist starting now — the eBird default for a park walk. */
export function newOuting(now = new Date()): Outing {
  const at = nowIso();
  return {
    id: crypto.randomUUID(),
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    area: DEFAULT_AREA,
    latitude: null,
    longitude: null,
    startTime: localDateTime(now),
    durationMin: null,
    distanceMi: null,
    protocol: 'traveling',
    observers: 1,
    allReported: true,
    comments: '',
  };
}

export function newObservation(
  outingId: string,
  species: { code: string | null; commonName: string; scientificName: string | null },
): Observation {
  const at = nowIso();
  return {
    id: crypto.randomUUID(),
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    outingId,
    speciesCode: species.code,
    commonName: species.commonName,
    scientificName: species.scientificName,
    count: 1,
    comments: '',
    breedingCode: null,
  };
}

/** Whole minutes between the outing's start and now, never negative. */
export function minutesSince(startTime: string, now = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - new Date(startTime).getTime()) / 60000));
}
