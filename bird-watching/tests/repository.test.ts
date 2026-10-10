import { describe, expect, it } from 'vitest';
import { exportBackup, importBackup } from '@/lib/log/backup';
import { newObservation, newOuting, minutesSince, localDateTime } from '@/lib/log/factory';
import { createMemoryRepository } from '@/lib/log/repository';
import { observationSchema, outingSchema } from '@/lib/log/schema';

describe('memory repository', () => {
  it('stores a sighting photo by id', async () => {
    const repo = createMemoryRepository();
    const photo = new Blob(['jpeg'], { type: 'image/jpeg' });
    await repo.savePhoto('p1', photo);
    expect(await repo.getPhoto('p1')).toBe(photo);
    expect(await repo.getPhoto('missing')).toBeUndefined();
  });

  it('saves, reads, and soft-deletes an outing with its observations', async () => {
    const repo = createMemoryRepository();
    const o = newOuting();
    const obs = newObservation(o.id, { code: 'norcar', commonName: 'Northern Cardinal', scientificName: 'Cardinalis cardinalis' });
    await repo.saveOuting(o);
    await repo.saveObservation(obs);
    expect(await repo.listObservations(o.id)).toEqual([obs]);
    await repo.deleteOuting(o.id);
    expect(await repo.getOuting(o.id)).toBeUndefined();
    expect(await repo.listOutings()).toEqual([]);
    expect(await repo.listObservations()).toEqual([]);
  });

  it('deletes a single observation', async () => {
    const repo = createMemoryRepository();
    const o = newOuting();
    const obs = newObservation(o.id, { code: null, commonName: 'Monk Parakeet', scientificName: null });
    await repo.saveObservation(obs);
    await repo.deleteObservation(obs.id);
    expect(await repo.listObservations(o.id)).toEqual([]);
  });
});

describe('factories', () => {
  it('produce records that satisfy the schema', () => {
    const o = newOuting(new Date(2026, 4, 10, 7, 5));
    expect(outingSchema.parse(o).startTime).toBe('2026-05-10T07:05');
    expect(() => observationSchema.parse(newObservation(o.id, { code: 'amerob', commonName: 'American Robin', scientificName: null }))).not.toThrow();
  });

  it('measures duration from the start time', () => {
    const start = new Date(2026, 4, 10, 7, 0);
    expect(minutesSince(localDateTime(start), new Date(2026, 4, 10, 8, 30))).toBe(90);
    expect(minutesSince(localDateTime(start), new Date(2026, 4, 10, 6, 0))).toBe(0);
  });
});

describe('backup', () => {
  it('round-trips, and a restore never overwrites newer local edits', async () => {
    const source = createMemoryRepository();
    const o = newOuting();
    await source.saveOuting(o);
    const backup = JSON.parse(JSON.stringify(await exportBackup(source)));

    const target = createMemoryRepository();
    expect(await importBackup(target, backup)).toEqual({ outings: 1, observations: 0 });
    await target.saveOuting({ ...o, area: 'North Woods', updatedAt: '2999-01-01T00:00:00.000Z' });
    expect(await importBackup(target, backup)).toEqual({ outings: 0, observations: 0 });
    expect((await target.getOuting(o.id))?.area).toBe('North Woods');
  });

  it('rejects a file that is not a backup', async () => {
    await expect(importBackup(createMemoryRepository(), { hello: 'world' })).rejects.toThrow(/isn't a Central Park Birding backup/);
  });
});
