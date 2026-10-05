import { CardState } from '@/components/weather/card-frame';
import type { UseWeatherDataResult } from '@/lib/hooks/use-weather-data';
import type { SelectedLocation } from '@/lib/weather/location';
import type { WeatherDashboardData } from '@/lib/weather/types';

/** One side of the comparison: the place as chosen, and its forecast request. */
export interface ComparedPlace {
  location: SelectedLocation;
  weather: UseWeatherDataResult;
}

/**
 * The reading to put on screen for a place: the fresh one, or — when the newest attempt failed —
 * the last one that loaded, exactly as the dashboard keeps a stale reading rather than emptying.
 */
export function shownWeather(weather: UseWeatherDataResult): WeatherDashboardData | undefined {
  return weather.state.status === 'ready' ? weather.state.data : weather.staleData;
}

/**
 * Why a place has no week to show, in place of its forecast.
 *
 * Polite rather than an alert even for a failure: the place's "Right now" card already raises the
 * failure (with its Try again), and saying it urgently twice per place is noise, not information.
 */
export function PlaceForecastState({ place }: { place: ComparedPlace }) {
  const { name } = place.location;
  const { state } = place.weather;

  if (state.status === 'loading') return <CardState label={`Loading the forecast for ${name}…`} />;
  if (state.status === 'error') return <CardState label={`The forecast for ${name} didn’t load.`} />;
  return <CardState label={`No 7-day forecast is available for ${name}.`} />;
}
