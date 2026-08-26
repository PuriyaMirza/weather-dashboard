'use client';

import { useSyncExternalStore } from 'react';
import { resolveTheme, type ResolvedTheme, type ThemePreference } from '@/lib/theme';

const QUERY = '(prefers-color-scheme: dark)';

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onStoreChange);
  return () => media.removeEventListener('change', onStoreChange);
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * What the page is *actually* showing right now, as opposed to the stored preference.
 *
 * Needed because "system" has no fixed answer: the hero's sky has to know whether it is being
 * drawn on a light or dark page. Subscribing to the media query means it keeps up if the user
 * changes their OS appearance while the tab is open.
 */
export function useResolvedTheme(preference: ThemePreference): ResolvedTheme {
  const prefersDark = useSyncExternalStore(subscribe, systemPrefersDark, () => false);
  return resolveTheme(preference, prefersDark);
}
