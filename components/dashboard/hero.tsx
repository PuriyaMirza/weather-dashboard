'use client';

import { atmosphereStyle, getAtmosphere, inferIsDay, NEUTRAL_ATMOSPHERE } from '@/lib/weather/atmosphere';
import { formatLocationLabel, type SelectedLocation } from '@/lib/weather/location';
import type { WeatherDashboardData } from '@/lib/weather/types';
import { formatHour, formatTemperature, formatTime } from '@/lib/weather/units';
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
  onRefresh: () => void;
  isRefreshing: boolean;
  /** True when the reading on screen is the last good one and the newest attempt failed. */
  isStale: boolean;
  /** Why the newest attempt failed, shown whether or not there is stale data behind it. */
  failureMessage?: string;
}

/** Hours shown in the strip. Enough to plan an afternoon without becoming a chart. */
const STRIP_HOURS = 8;

/**
 * The masthead: where you are, when the reading is from, and what the sky is doing.
 *
 * It deliberately does *not* restate the temperature — that is the Temperature module's job, and
 * printing 72° twice on one screen was the most obvious flaw in the previous design. What the hero
 * adds instead is the near-term shape of the day, which no single module carries.
 *
 * The tonal wash is decorative. The condition and whether it is day or night are also stated in
 * words, so nothing is conveyed by tone alone.
 */
export function Hero({
  location,
  data,
  isLoading,
  errorMessage,
  unitSystem,
  hasHydrated,
  resolvedTheme,
  onRefresh,
  isRefreshing,
  isStale,
  failureMessage,
}: HeroProps) {
  const current = data?.current;
  const timeZone = data?.location.timezone;

  const isDay = current
    ? (current.isDay ?? inferIsDay(current.observedAt, data?.sun?.sunrise ?? null, data?.sun?.sunset ?? null))
    : true;

  // In dark mode the sky always uses the night palette — a bright hero above dark modules reads as
  // a rendering bug. The weather still drives the tone, so it remains reactive either way.
  const useNightSky = resolvedTheme === 'dark' || !isDay;
  const atmosphere = current
    ? getAtmosphere(current.condition, !useNightSky)
    : resolvedTheme === 'dark'
      ? getAtmosphere('cloudy', false)
      : NEUTRAL_ATMOSPHERE;

  const hours = (data?.hourly ?? []).slice(0, STRIP_HOURS);

  return (
    <section
      aria-labelledby="hero-heading"
      className="atmosphere mt-6 border border-line px-5 py-6 sm:px-8 sm:py-8"
      style={atmosphereStyle(atmosphere)}
    >
      <h2 id="hero-heading" className="sr-only">
        Current conditions
      </h2>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="font-display text-3xl leading-none text-sky-ink sm:text-5xl">
          {hasHydrated ? formatLocationLabel(location) : 'Loading…'}
        </p>

        <div className="flex items-center gap-4">
          {data?.updatedAt && (
            <p className="eyebrow text-sky-ink-muted">Updated {formatTime(data.updatedAt, timeZone)}</p>
          )}
          {hasHydrated && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="eyebrow border border-sky-ink-muted px-3 py-1.5 text-sky-ink outline-none hover:bg-sky-ink hover:text-canvas focus-visible:ring-2 focus-visible:ring-sky-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/*
        The reading is real but out of date. Saying so once here — rather than replacing every
        module with an error — keeps a working dashboard on screen while being honest that it is
        not current. role="status" rather than "alert": nothing is broken, the data is just old.
      */}
      {isStale && (
        <p role="status" className="mt-4 border border-sky-ink-muted px-3 py-2 text-sm text-sky-ink">
          Showing the last reading that loaded. {failureMessage}
        </p>
      )}

      {errorMessage ? (
        <div className="mt-5 max-w-xl">
          <p role="alert" className="text-sm text-sky-ink">
            {errorMessage}
          </p>
          {/* Without this the only way out of a failed load is a page reload. */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="eyebrow mt-3 border border-sky-ink-muted px-3 py-1.5 text-sky-ink outline-none hover:bg-sky-ink hover:text-canvas focus-visible:ring-2 focus-visible:ring-sky-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRefreshing ? 'Trying…' : 'Try again'}
          </button>
        </div>
      ) : isLoading || !current ? (
        <p role="status" className="mt-5 text-sm text-sky-ink-muted">
          {isLoading ? 'Loading current conditions…' : 'Current conditions are unavailable.'}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-sky-ink">
            {current.conditionLabel} · {isDay ? 'Daytime' : 'Night'}
            {data?.sun?.sunset && isDay && <> · Sunset {formatTime(data.sun.sunset, timeZone)}</>}
            {data?.sun?.sunrise && !isDay && <> · Sunrise {formatTime(data.sun.sunrise, timeZone)}</>}
          </p>

          {hours.length > 0 && (
            <>
              <h3 className="sr-only">Next hours</h3>
              {/*
                A row of hairline-separated columns rather than a chart: this is the shape of the
                next few hours at a glance, and it stays readable in greyscale and at phone width.
                It scrolls horizontally rather than shrinking below legibility.
              */}
              <ul className="mt-6 flex overflow-x-auto border-t border-line-strong pt-4">
                {hours.map((hour) => (
                  <li
                    key={hour.time}
                    className="flex min-w-[4.5rem] flex-1 flex-col gap-1 border-l border-line px-3 first:border-l-0 first:pl-0"
                  >
                    <span className="eyebrow text-sky-ink-muted">{formatHour(hour.time, timeZone)}</span>
                    <span className="font-display text-2xl leading-none text-sky-ink tabular-nums">
                      {formatTemperature(hour.temperatureF, unitSystem)}
                    </span>
                    <span className="text-[0.6875rem] text-sky-ink-muted">{hour.precipitationChance}% rain</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
