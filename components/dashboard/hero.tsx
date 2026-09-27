'use client';

import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import { CurrentConditionsSummary, MISSING } from '@/components/dashboard/current-conditions-summary';
import { HeroIllustration } from '@/components/dashboard/hero-illustration';
import { HourlyStrip } from '@/components/dashboard/hourly-strip';
import {
  atmosphereStyle,
  getAtmosphere,
  inferIsDay,
  NEUTRAL_ATMOSPHERE,
  skyHeadline,
} from '@/lib/weather/atmosphere';
import { formatRegionLabel, type SelectedLocation } from '@/lib/weather/location';
import type { AirQualityMetrics, WeatherDashboardData } from '@/lib/weather/types';
import { AQI_CATEGORY_LABEL } from '@/lib/weather/metrics';
import { formatTemperature, formatTime, type UnitSystem } from '@/lib/weather/units';

interface HeroProps {
  location: SelectedLocation;
  data?: WeatherDashboardData;
  isLoading: boolean;
  errorMessage?: string;
  unitSystem: UnitSystem;
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

function AirQualityStrip({ airQuality }: { airQuality: AirQualityMetrics }) {
  const { category, usAqi, pm2_5: pm25 } = airQuality;
  // Nothing worth a row: better no strip than one reading "— • —".
  if (category == null && usAqi == null && pm25 == null) return null;

  return (
    <div className="flex items-center gap-2.5 bg-surface-container-lowest/85 px-5 py-3 backdrop-blur-md">
      <Icon name="air" size={20} className="shrink-0 text-secondary" />
      <div className="flex min-w-0 flex-col">
        <p className="type-label-md text-on-surface">
          Air Quality: {category ? AQI_CATEGORY_LABEL[category] : MISSING}
        </p>
        <p className="type-label-sm text-on-secondary-container">
          US AQI {usAqi == null ? MISSING : Math.round(usAqi)} • PM2.5{' '}
          {pm25 == null ? MISSING : `${Math.round(pm25)} µg/m³`}
        </p>
      </div>
    </div>
  );
}

/**
 * The top of the page: an illustrated card naming the sky and the day ahead, the current reading,
 * and the next hours.
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
  onRefresh,
  isRefreshing,
  isStale,
  failureMessage,
}: HeroProps) {
  const current = data?.current ?? null;
  const timeZone = data?.location.timezone;

  const isDay = current
    ? (current.isDay ?? inferIsDay(current.observedAt, data?.sun?.sunrise ?? null, data?.sun?.sunset ?? null))
    : true;

  const atmosphere = current ? getAtmosphere(current.condition, isDay) : NEUTRAL_ATMOSPHERE;
  // The region of the reading on screen, not of the store's location: right after a location
  // change the old forecast is still showing, and its chip must not claim the new place.
  const region = formatRegionLabel(data?.location ?? location);

  // Explicit minmax(0, 1fr) tracks (grid-cols-1): an implicit auto track grows to the hour strip's
  // full scroll width, pushing the whole page wider than a phone.
  return (
    <section aria-labelledby="hero-heading" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          className="flex items-start gap-2.5 rounded-xl bg-surface-container-high px-4 py-3 type-body-sm text-on-surface lg:col-span-2"
        >
          <Icon name="info" size={20} className="mt-px shrink-0 text-secondary" />
          <span>Showing the last reading that loaded. {failureMessage}</span>
        </p>
      )}

      <Surface
        tone="lowest"
        elevation="raised"
        radius="2xl"
        // Alone on its row until a reading arrives, so a loading or failed hero isn't half-width.
        className={`relative overflow-hidden ${current ? '' : 'lg:col-span-2'}`}
      >
        <div className="relative flex h-56 flex-col justify-end overflow-hidden p-5" style={atmosphereStyle(atmosphere)}>
          <HeroIllustration palette={atmosphere} />
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

        {data?.airQuality && <AirQualityStrip airQuality={data.airQuality} />}
      </Surface>

      {data && current && <CurrentConditionsSummary data={data} isDay={isDay} unitSystem={unitSystem} />}

      {data && current && !errorMessage && (
        <div className="lg:col-span-2">
          <HourlyStrip data={data} unitSystem={unitSystem} />
        </div>
      )}
    </section>
  );
}
