'use client';

import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import { HeroIllustration } from '@/components/dashboard/hero-illustration';
import { WeatherEffect } from '@/components/dashboard/weather-effect';
import {
  atmosphereStyle,
  getAtmosphere,
  currentIsDay,
  NEUTRAL_ATMOSPHERE,
  skyHeadline,
} from '@/lib/weather/atmosphere';
import { formatRegionLabel, type SelectedLocation } from '@/lib/weather/location';
import { getFavoriteMetric, type FavoriteMetricId } from '@/lib/weather/favorite-metrics';
import type { WeatherDashboardData } from '@/lib/weather/types';
import { formatTemperature, formatTime, type UnitSystem } from '@/lib/weather/units';

interface HeroProps {
  location: SelectedLocation;
  data?: WeatherDashboardData;
  isLoading: boolean;
  errorMessage?: string;
  unitSystem: UnitSystem;
  /** The readings pinned under the heading, in the order the user chose. */
  favoriteMetrics: FavoriteMetricId[];
  onRefresh: () => void;
  isRefreshing: boolean;
  /** True when the reading on screen is the last good one and the newest attempt failed. */
  isStale: boolean;
  /** Why the newest attempt failed, shown whether or not there is stale data behind it. */
  failureMessage?: string;
}

/**
 * The sentence under the hero heading: today's range and the next sun event. The sunset is only
 * mentioned by day and the sunrise only by night — whichever is coming next.
 */
function daySummary(data: WeatherDashboardData, isDay: boolean, unitSystem: UnitSystem): string | null {
  const current = data.current;
  if (!current) return null;
  const timeZone = data.location.timezone;
  const range = `High of ${formatTemperature(current.highF, unitSystem)}, low of ${formatTemperature(current.lowF, unitSystem)}.`;
  const sunEvent = isDay ? data.sun?.sunset : data.sun?.sunrise;
  if (!sunEvent) return range;
  return `${range} ${isDay ? 'Sunset' : 'Sunrise'} at ${formatTime(sunEvent, timeZone)}.`;
}

/**
 * The user's pinned readings. A missing upstream value renders a dash — the tile stays so the row
 * doesn't reshuffle — and each label has a spoken form where the visible one is abbreviated.
 */
function FavoriteMetricsStrip({
  data,
  ids,
  unitSystem,
}: {
  data: WeatherDashboardData;
  ids: FavoriteMetricId[];
  unitSystem: UnitSystem;
}) {
  return (
    <dl
      aria-label="Favorite readings"
      className="grid auto-cols-fr grid-flow-col gap-2 bg-surface-container-lowest/85 px-4 py-3 backdrop-blur-md"
    >
      {ids.map((id) => {
        const metric = getFavoriteMetric(id);
        const reading = metric.read(data, unitSystem);
        return (
          <div key={id} className="flex min-w-0 flex-col items-center text-center">
            <dt className="flex flex-col items-center gap-0.5 type-label-sm text-on-secondary-container">
              <Icon name={metric.icon} size={18} className="text-secondary" />
              <span aria-hidden="true">{metric.label}</span>
              <span className="sr-only">{metric.title}</span>
            </dt>
            <dd className="mt-0.5 type-label-md font-bold text-primary tabular-nums">
              {reading.spoken ? <span className="sr-only">{reading.spoken}</span> : null}
              <span aria-hidden={reading.spoken ? true : undefined}>{reading.value}</span>
              {reading.unit && (
                <span
                  aria-hidden={reading.spoken ? true : undefined}
                  className="block type-label-sm font-normal text-on-secondary-container"
                >
                  {reading.unit}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * The top of the page: an illustrated card naming the sky and the day ahead, with the user's
 * favorite readings beneath it. The current reading (Right Now) and the next hours are grid
 * modules, so they can be moved.
 *
 * Everything the dashboard knows about the request's health is said here, once — a stale banner
 * over an old reading, or an alert with a retry when there is no reading at all — rather than
 * repeated from every module.
 *
 * The tree-line art and its weather-tinted sky are decorative. The condition and time of day are
 * always in the heading as words, so nothing is conveyed by tone alone.
 */
export function Hero({
  location,
  data,
  isLoading,
  errorMessage,
  unitSystem,
  favoriteMetrics,
  onRefresh,
  isRefreshing,
  isStale,
  failureMessage,
}: HeroProps) {
  const current = data?.current ?? null;
  const timeZone = data?.location.timezone;

  const isDay = data ? currentIsDay(data) : true;

  const atmosphere = current ? getAtmosphere(current.condition, isDay) : NEUTRAL_ATMOSPHERE;
  // The region of the reading on screen, not of the store's location: right after a location
  // change the old forecast is still showing, and its chip must not claim the new place.
  const region = formatRegionLabel(data?.location ?? location);

  return (
    <section aria-labelledby="hero-heading" className="grid grid-cols-1 gap-6">
      <h2 id="hero-heading" className="sr-only">
        Current conditions
      </h2>

      {/*
        The reading is real but out of date. Saying so once here — rather than replacing every
        module with an error — keeps a working dashboard on screen while being honest that it is
        not current. role="status" rather than "alert": nothing is broken, the data is just old.
      */}
      {isStale && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-xl bg-surface-container-high px-4 py-3 type-body-sm text-on-surface"
        >
          <Icon name="info" size={20} className="mt-px shrink-0 text-secondary" />
          <span>Showing the last reading that loaded. {failureMessage}</span>
        </p>
      )}

      <Surface
        tone="lowest"
        elevation="raised"
        radius="2xl"
        className="relative overflow-hidden"
      >
        <div className="relative flex h-56 flex-col justify-end overflow-hidden p-5" style={atmosphereStyle(atmosphere)}>
          <HeroIllustration palette={atmosphere} />
          {current && <WeatherEffect condition={current.condition} isDay={isDay} />}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-linear-to-t from-surface-container-lowest via-surface-container-high/40 to-transparent"
          />

          <div className="relative flex flex-col gap-1.5">
            {errorMessage ? (
              <>
                <p role="alert" className="type-body-md text-sky-ink">
                  {errorMessage}
                </p>
                {/* Without this the only way out of a failed load is a page reload. */}
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="mt-1 inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-secondary-container px-5 type-label-lg text-secondary-fixed shadow-card outline-none hover:bg-surface-bright focus-visible:ring-2 focus-visible:ring-secondary-fixed disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="refresh" size={18} />
                  {isRefreshing ? 'Trying…' : 'Try again'}
                </button>
              </>
            ) : isLoading || !current || !data ? (
              <p role="status" className="type-body-md text-sky-ink-muted">
                {isLoading ? 'Loading current conditions…' : 'Current conditions are unavailable.'}
              </p>
            ) : (
              <>
                {region && (
                  <Chip dot className="self-start shadow-card backdrop-blur-md">
                    {region}
                  </Chip>
                )}
                <h3 className="mt-1 type-headline-sm font-bold tracking-tight text-sky-ink">
                  {skyHeadline(current.condition, isDay, current.observedAt, timeZone)}
                </h3>
                <p className="type-body-sm text-sky-ink-muted">{daySummary(data, isDay, unitSystem)}</p>
              </>
            )}
          </div>
        </div>

        {data && current && <FavoriteMetricsStrip data={data} ids={favoriteMetrics} unitSystem={unitSystem} />}
      </Surface>

    </section>
  );
}
