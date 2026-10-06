'use client';

import { useCallback, useEffect, useState } from 'react';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; httpStatus: number | null }
  | { status: 'ready'; data: T };

/**
 * GETs one of our own routes. Errors carry the route's `{ error }` sentence when there is one,
 * so the reader sees why ("no eBird key", "eBird is down") rather than a generic failure.
 */
export function useApi<T>(url: string) {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });
  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const response = await fetch(url);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body && typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.';
        return setState({ status: 'error', message, httpStatus: response.status });
      }
      setState({ status: 'ready', data: body as T });
    } catch {
      setState({ status: 'error', message: "You're offline, or the app couldn't be reached.", httpStatus: null });
    }
  }, [url]);
  useEffect(() => {
    // Fetching our own route is an external-system sync, the case effects exist for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  return { state, reload: load };
}
