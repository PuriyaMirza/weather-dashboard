import { softDeleted, type SightingsRepository } from './repository';
import type { Observation, Outing } from './schema';

const DB_NAME = 'central-park-birding';
const DB_VERSION = 1;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  const open = indexedDB.open(DB_NAME, DB_VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    db.createObjectStore('outings', { keyPath: 'id' });
    db.createObjectStore('observations', { keyPath: 'id' }).createIndex('outingId', 'outingId');
  };
  return request(open);
}

/**
 * The on-device log. IndexedDB rather than localStorage: a season of checklists outgrows
 * localStorage's ~5 MB, and photos attached to sightings later would never fit.
 */
export function createIndexedDbRepository(): SightingsRepository {
  let db: Promise<IDBDatabase> | null = null;
  const database = () => (db ??= openDatabase());

  async function getAll<T extends { deletedAt: string | null }>(store: string, outingId?: string): Promise<T[]> {
    const tx = (await database()).transaction(store, 'readonly');
    const source = outingId ? tx.objectStore(store).index('outingId') : tx.objectStore(store);
    const rows = (await request(outingId ? source.getAll(outingId) : source.getAll())) as T[];
    return rows.filter((r) => !r.deletedAt);
  }

  async function put(store: string, ...values: unknown[]) {
    const tx = (await database()).transaction(store, 'readwrite');
    for (const value of values) tx.objectStore(store).put(value);
    await done(tx);
  }

  async function get<T>(store: string, id: string): Promise<T | undefined> {
    const tx = (await database()).transaction(store, 'readonly');
    return (await request(tx.objectStore(store).get(id))) as T | undefined;
  }

  return {
    listOutings: () => getAll<Outing>('outings'),
    async getOuting(id) {
      const outing = await get<Outing>('outings', id);
      return outing && !outing.deletedAt ? outing : undefined;
    },
    saveOuting: (outing) => put('outings', outing),
    async deleteOuting(id) {
      const outing = await get<Outing>('outings', id);
      if (!outing) return;
      const observations = await getAll<Observation>('observations', id);
      await put('outings', softDeleted(outing));
      await put('observations', ...observations.map(softDeleted));
    },
    listObservations: (outingId) => getAll<Observation>('observations', outingId),
    saveObservation: (observation) => put('observations', observation),
    async deleteObservation(id) {
      const obs = await get<Observation>('observations', id);
      if (obs) await put('observations', softDeleted(obs));
    },
  };
}
