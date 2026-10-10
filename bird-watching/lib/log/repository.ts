import type { Observation, Outing } from './schema';

/**
 * Storage for the sighting log. The UI only talks to this interface, so the on-device
 * implementation can later sit behind (or be swapped for) a synced one without touching screens.
 * Reads exclude soft-deleted records; deletes are soft.
 */
export interface SightingsRepository {
  listOutings(): Promise<Outing[]>;
  getOuting(id: string): Promise<Outing | undefined>;
  saveOuting(outing: Outing): Promise<void>;
  deleteOuting(id: string): Promise<void>;
  /** All live observations, or one outing's when `outingId` is given. */
  listObservations(outingId?: string): Promise<Observation[]>;
  saveObservation(observation: Observation): Promise<void>;
  deleteObservation(id: string): Promise<void>;
  /** Photos are blobs keyed by an observation's `photoId`; they aren't part of the JSON backup. */
  savePhoto(id: string, photo: Blob): Promise<void>;
  getPhoto(id: string): Promise<Blob | undefined>;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Marks a record deleted without removing it, so the deletion can sync later. */
export function softDeleted<T extends { deletedAt: string | null; updatedAt: string }>(record: T): T {
  const at = nowIso();
  return { ...record, deletedAt: at, updatedAt: at };
}

/** In-memory implementation: the reference behaviour, used by tests and as a no-IndexedDB fallback. */
export function createMemoryRepository(): SightingsRepository {
  const outings = new Map<string, Outing>();
  const observations = new Map<string, Observation>();
  const photos = new Map<string, Blob>();
  const live = <T extends { deletedAt: string | null }>(r: T | undefined) => (r && !r.deletedAt ? r : undefined);

  return {
    async listOutings() {
      return [...outings.values()].filter((o) => !o.deletedAt);
    },
    async getOuting(id) {
      return live(outings.get(id));
    },
    async saveOuting(outing) {
      outings.set(outing.id, outing);
    },
    async deleteOuting(id) {
      const outing = outings.get(id);
      if (outing) outings.set(id, softDeleted(outing));
      for (const obs of observations.values()) {
        if (obs.outingId === id && !obs.deletedAt) observations.set(obs.id, softDeleted(obs));
      }
    },
    async listObservations(outingId) {
      return [...observations.values()].filter((o) => !o.deletedAt && (!outingId || o.outingId === outingId));
    },
    async saveObservation(observation) {
      observations.set(observation.id, observation);
    },
    async deleteObservation(id) {
      const obs = observations.get(id);
      if (obs) observations.set(id, softDeleted(obs));
    },
    async savePhoto(id, photo) {
      photos.set(id, photo);
    },
    async getPhoto(id) {
      return photos.get(id);
    },
  };
}

