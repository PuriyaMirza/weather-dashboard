import type { SightingsRepository } from './repository';
import { backupSchema, type Backup } from './schema';

export async function exportBackup(repo: SightingsRepository): Promise<Backup> {
  return {
    app: 'central-park-birding',
    version: 1,
    exportedAt: new Date().toISOString(),
    outings: await repo.listOutings(),
    observations: await repo.listObservations(),
  };
}

/**
 * Restores a backup file. Merges rather than replaces: a record is written only when it is new
 * or newer than the local copy, so restoring an old backup never overwrites newer edits.
 * Throws a readable error for a file that isn't one of ours.
 */
export async function importBackup(repo: SightingsRepository, json: unknown): Promise<{ outings: number; observations: number }> {
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) throw new Error("That file isn't a Central Park Birding backup.");
  const { outings, observations } = parsed.data;
  let outingCount = 0;
  let observationCount = 0;
  for (const outing of outings) {
    const local = await repo.getOuting(outing.id);
    if (!local || local.updatedAt < outing.updatedAt) {
      await repo.saveOuting(outing);
      outingCount += 1;
    }
  }
  const localObservations = new Map((await repo.listObservations()).map((o) => [o.id, o]));
  for (const obs of observations) {
    const local = localObservations.get(obs.id);
    if (!local || local.updatedAt < obs.updatedAt) {
      await repo.saveObservation(obs);
      observationCount += 1;
    }
  }
  return { outings: outingCount, observations: observationCount };
}
