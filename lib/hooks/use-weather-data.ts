'use client';

import { useEffect, useState } from 'react';
import type { SelectedLocation } from '@/lib/weather/location';
import type { WeatherDataState } from '@/lib/weather/types';

const LOADING: WeatherDataState = { status: 'loading' };

/**
 * Fetches the forecast for a location through our own route handler — one request per location
 * change, whose result is handed to every card. Cards never fetch for themselves.
 *
 * Passing `null` holds the hook in its loading state, which is what the dashboard does until
 * persisted preferences have rehydrated.
 */
export function useWeatherData(location: SelectedLocation | null): WeatherDataState {
  // Results are stored against the request that produced them. Loading is then *derived* — if the
  // stored result belongs to a previous location, this render is by definition still loading — so
  // no state has to be set synchronously when the location changes.
  const [result, setResult] = useState<{ key: string; state: WeatherDataState } | null>(null);

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
      try {
        const response = await fetch(`/api/weather?${params.toString()}`, { signal: controller.signal });
        const body = await response.json();

        if (!response.ok) {
          setResult({ key, state: { status: 'error', errorMessage: body?.error ?? 'Unable to load weather data.' } });
          return;
        }
        setResult({ key, state: { status: 'ready', data: body } });
      } catch (error) {
        // An aborted request means a newer one superseded it; its result is no longer wanted.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResult({ key, state: { status: 'error', errorMessage: 'Unable to load weather data.' } });
      }
    }

    void load();

    return () => controller.abort();
  }, [key, latitude, longitude, name, region, country]);

  return result?.key === key ? result.state : LOADING;
}
