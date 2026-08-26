'use client';

import { atmosphereStyle, getAtmosphere, inferIsDay, NEUTRAL_ATMOSPHERE } from '@/lib/weather/atmosphere';
import { formatLocationLabel, type SelectedLocation } from '@/lib/weather/location';
import type { WeatherDashboardData } from '@/lib/weather/types';
import { describeTemperature, formatPercent, formatSpeed, formatTemperature } from '@/lib/weather/units';
import type { UnitSystem } from '@/lib/weather/units';

interface HeroProps {
  /** What the page is actually showing, so a light sky never lands on a dark page. */
  resolvedTheme: 'light' | 'dark';
  location: SelectedLocation;
  data?: WeatherDashboardData;
  isLoading: boolean;
  errorMessage?: string;
  unitSystem: UnitSystem;
  hasHydrated: boolean;
}

/**
 * The headline treatment: current conditions set against a sky that changes with the weather.
 *
 * The gradient is decorative. Everything it hints at — the condition, whether it is day or night —
 * is also stated in text, so nothing is conveyed by colour alone.
 */
export function Hero({ location, data, isLoading, errorMessage, unitSystem, hasHydrated, resolvedTheme }: HeroProps) {
  const current = data?.current;

  const isDay = current
    ? (current.isDay ?? inferIsDay(current.observedAt, data?.sun?.sunrise ?? null, data?.sun?.sunset ?? null))
    : true;

  // In dark mode the sky always uses the night palette — a bright hero above dark cards reads as a
  // rendering bug. The weather still drives the hue, so the sky remains reactive either way.
  const useNightSky = resolvedTheme === 'dark' || !isDay;
  const atmosphere = current
    ? getAtmosphere(current.condition, !useNightSky)
    : resolvedTheme === 'dark'
      ? getAtmosphere('cloudy', false)
      : NEUTRAL_ATMOSPHERE;

  return (
    <section
      aria-labelledby="hero-heading"
      className="atmosphere relative overflow-hidden rounded-[2rem] border border-line px-6 py-8 sm:px-10 sm:py-12"
      style={atmosphereStyle(atmosphere)}
    >
      <h2 id="hero-heading" className="sr-only">
        Current conditions
      </h2>

      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-ink-muted">
        {hasHydrated ? formatLocationLabel(location) : 'Loading…'}
      </p>

      {errorMessage ? (
        <p role="alert" className="mt-6 max-w-lg text-lg font-medium text-sky-ink">
          {errorMessage}
        </p>
      ) : isLoading || !current ? (
        <p role="status" className="mt-6 text-lg font-medium text-sky-ink-muted">
          {isLoading ? 'Loading current conditions…' : 'Current conditions are unavailable.'}
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p
              className="text-7xl font-bold leading-none tracking-tight text-sky-ink sm:text-8xl"
              aria-label={describeTemperature(current.temperatureF, unitSystem)}
            >
              {formatTemperature(current.temperatureF, unitSystem)}
            </p>
            <div className="pb-2">
              <p className="text-2xl font-semibold text-sky-ink">{current.conditionLabel}</p>
              <p className="text-base text-sky-ink-muted">
                Feels like {formatTemperature(current.feelsLikeF, unitSystem)} · {isDay ? 'Daytime' : 'Night'}
              </p>
            </div>
          </div>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sky-ink">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-sky-ink-muted">High / Low</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatTemperature(current.highF, unitSystem)} / {formatTemperature(current.lowF, unitSystem)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-sky-ink-muted">Wind</dt>
              <dd className="mt-1 text-lg font-semibold">
                {current.windDirection} {formatSpeed(current.windMph, unitSystem)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-sky-ink-muted">Rain chance</dt>
              <dd className="mt-1 text-lg font-semibold">{formatPercent(current.precipitationChance)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
