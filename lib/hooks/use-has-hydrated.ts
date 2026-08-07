'use client';

import { useSyncExternalStore } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';

function subscribe(onStoreChange: () => void) {
  const unsubscribe = useDashboardStore.persist.onFinishHydration(onStoreChange);
  // The store is created with `skipHydration`, so nothing reads storage until this runs — which
  // only happens on the client, after mount.
  void useDashboardStore.persist.rehydrate();
  return unsubscribe;
}

/**
 * False on the server and on the first client render — which is precisely what makes those two
 * renders agree — then true once persisted preferences have been applied.
 *
 * Uses useSyncExternalStore rather than useState/useEffect so the server snapshot is explicit and
 * no state is set synchronously during an effect.
 *
 * Callers should render a neutral placeholder while this is false rather than rendering default
 * preferences, which would otherwise flash and then be replaced by the user's saved ones.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => useDashboardStore.persist.hasHydrated(),
    () => false,
  );
}
