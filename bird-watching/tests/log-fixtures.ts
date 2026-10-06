import type { Observation, Outing } from '@/lib/log/schema';

let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;

export function outing(overrides: Partial<Outing> = {}): Outing {
  return {
    id: uuid(), createdAt: '2026-05-10T11:00:00.000Z', updatedAt: '2026-05-10T11:00:00.000Z', deletedAt: null,
    area: 'The Ramble', latitude: null, longitude: null, startTime: '2026-05-10T07:15', durationMin: 120,
    distanceMi: 1.5, protocol: 'traveling', observers: 2, allReported: true, comments: '', ...overrides,
  };
}

export function observation(outingId: string, overrides: Partial<Observation> = {}): Observation {
  return {
    id: uuid(), createdAt: '2026-05-10T11:00:00.000Z', updatedAt: '2026-05-10T11:00:00.000Z', deletedAt: null,
    outingId, speciesCode: 'amerob', commonName: 'American Robin', scientificName: 'Turdus migratorius',
    count: 3, comments: '', breedingCode: null, ...overrides,
  };
}
