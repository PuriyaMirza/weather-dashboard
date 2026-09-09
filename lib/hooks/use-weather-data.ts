'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SelectedLocation } from '@/lib/weather/location';
import type { WeatherDashboardData, WeatherDataState } from '@/lib/weather/types';

const LOADING: WeatherDataState = { status: 'loading' };

export interface UseWeatherDataResult {
  state: WeatherDataState;
  /** Re-requests the current location's forecast. A no-op while no location is selected. */
  refresh: () => void;
  /** True while a refresh is in flight over a reading already on screen. */
  isRefreshing: boolean;
  /**
   * The last reading that loaded successfully for *this* location, when the newest attempt
   * failed. Present only alongside an error state — the caller decides whether to keep showing it.
   */
  staleData?: WeatherDashboardData;
}

interface StoredResult {
  key: string;
  state: WeatherDataState;
  /** Carried across a failed refresh so a blip doesn't blank a working dashboard. */
  lastGood?: WeatherDashboardData;
}

/** Carries a good reading forward, but only within the same location. */
function keepLastGood(previous: StoredResult | null, key: string): WeatherDashboardData | undefined {
  if (previous?.key !== key) return undefined;
  return previous.state.status === 'ready' ? previous.state.data : previous.lastGood;
}

/**
 * Fetches the forecast for a location through our own route handler — one request per location
 * change, whose result is handed to every module. Modules never fetch for themselves.
 *
 * Passing `null` holds the hook in its loading state, which is what the dashboard does until
 * persisted preferences have rehydrated.
 *
 * Nothing here is persisted. A failed *refresh* keeps the previous reading in memory so the
 * dashboard degrades instead of emptying, but a fresh page load that fails shows the error:
 * serving yesterday's weather out of storage would be worse than serving none.
 */
export function useWeatherData(location: SelectedLocation | null): UseWeatherDataResult {
  // Results are stored against the request that produced them. Loading is then *derived* — if the
  // stored result belongs to a previous location, this render is by definition still loading — so
  // no state has to be set synchronously when the location changes.
  const [result, setResult] = useState<StoredResult | null>(null);
  // Bumping this re-runs the effect for the same location, which is what a refresh is.
  const [attempt, setAttempt] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const name = location?.name;
  const region = location?.region ?? '';
  const country = location?.country ?? '';

  const key =
    latitude === undefined || longitude === undefined || name === undefined
      ? ''
      : `${latitude}|${longitude}|${name}|${region}|${country}`;

  useEffect(() => {
    if (!key || latitude === undefined || longitude === undefined || name === undefined) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      name,
      region,
      country,
    });

    async function load() {
      // A refresh re-requests the same URL, so without this the browser or CDN could hand back
      // exactly what is already on screen and the button would appear to do nothing.
      const init: RequestInit = { signal: controller.signal, cache: attempt > 0 ? 'no-store' : 'default' };

      try {
        const response = await fetch(`/api/weather?${params.toString()}`, init);
        const body = await response.json();

        if (!response.ok) {
          setResult((previous) => ({
            key,
            state: { status: 'error', errorMessage: body?.error ?? 'Unable to load weather data.' },
            lastGood: keepLastGood(previous, key),
          }));
          return;
        }
        setResult({ key, state: { status: 'ready', data: body } });
      } catch (error) {
        // An aborted request means a newer one superseded it; its result is no longer wanted.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResult((previous) => ({
          key,
          state: { status: 'error', errorMessage: 'Unable to load weather data.' },
          lastGood: keepLastGood(previous, key),
        }));
      } finally {
        setIsRefreshing(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [key, latitude, longitude, name, region, country, attempt]);

  const refresh = useCallback(() => {
    if (!key) return;
    setIsRefreshing(true);
    setAttempt((value) => value + 1);
  }, [key]);

  const current = result?.key === key ? result : null;

  return {
    state: current?.state ?? LOADING,
    refresh,
    // A refresh that outlived a location change isn't a refresh any more.
    isRefreshing: isRefreshing && current !== null,
    staleData: current?.state.status === 'error' ? current.lastGood : undefined,
  };
}
