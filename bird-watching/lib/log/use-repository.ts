'use client';

import { createIndexedDbRepository } from './indexeddb-repository';
import { createMemoryRepository, type SightingsRepository } from './repository';

let repository: SightingsRepository | null = null;

/**
 * The app-wide log store. Falls back to memory when IndexedDB is unavailable (some private
 * browsing modes) — the log still works for the session, and the UI warns that it won't persist.
 */
export function getRepository(): { repo: SightingsRepository; persistent: boolean } {
  const persistent = typeof indexedDB !== 'undefined';
  repository ??= persistent ? createIndexedDbRepository() : createMemoryRepository();
  return { repo: repository, persistent };
}
