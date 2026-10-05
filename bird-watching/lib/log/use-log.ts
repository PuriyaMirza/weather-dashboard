'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Observation, Outing } from './schema';
import { getRepository } from './use-repository';

export type LogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; outings: Outing[]; observations: Observation[] };

/** Loads the whole log once on mount; `reload` after a write. */
export function useLog() {
  const [state, setState] = useState<LogState>({ status: 'loading' });
  const reload = useCallback(async () => {
    try {
      const { repo } = getRepository();
      const [outings, observations] = await Promise.all([repo.listOutings(), repo.listObservations()]);
      outings.sort((a, b) => b.startTime.localeCompare(a.startTime));
      setState({ status: 'ready', outings, observations });
    } catch {
      setState({ status: 'error', message: "Couldn't open your log on this device." });
    }
  }, []);
  useEffect(() => {
    // Reading IndexedDB is an external-system sync, the case effects exist for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);
  return { state, reload };
}

export function downloadFile(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** "Sat, Oct 4 · 7:15 AM" from a local "YYYY-MM-DDTHH:mm". */
export function formatStart(startTime: string): string {
  const date = new Date(startTime);
  const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
