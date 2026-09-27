import type { PressureTrend } from '@/lib/weather/types';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
import {
  formatDistance,
  formatPercent,
  formatPressure,
  formatTemperatureWithUnit,
} from '@/lib/weather/units';

const TITLE = 'Atmospheric Details';
const DESCRIPTION = 'Pressure, cloud cover, visibility, and humidity.';

/** Arrows are paired with words so the trend never depends on the glyph alone. */
const PRESSURE_TREND_LABEL: Record<PressureTrend, string> = {
  rising: '↑ Rising',
  falling: '↓ Falling',
  steady: '→ Steady',
};

function describeCloudCover(percent: number): string {
  if (percent < 12) return 'Clear';
  if (percent < 38) return 'Mostly clear';
  if (percent < 63) return 'Partly cloudy';
  if (percent < 88) return 'Mostly cloudy';
  return 'Overcast';
}

export function AtmosphericDetailsCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const atmospheric = data?.atmospheric;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      icon="pressure"
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!atmospheric}
      loadingLabel="Loading atmospheric details…"
      unavailableLabel="Atmospheric data is unavailable."
    >
      {atmospheric && (
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-headline-md text-primary @[20rem]:text-[2.25rem] @[20rem]:leading-[2.75rem]">
                {formatPressure(atmospheric.pressureInHg, unitSystem)}
              </p>
              {atmospheric.pressureTrend && (
                <span className="rounded-full bg-surface-container-highest px-3 py-1 type-label-md text-secondary-fixed">
                  {PRESSURE_TREND_LABEL[atmospheric.pressureTrend]}
                </span>
              )}
            </div>
            <p className="mt-0.5 type-body-sm text-secondary-fixed">Sea-level pressure</p>
          </div>

          <dl className="grid grid-cols-1 gap-2 @[12rem]:grid-cols-2 @[32rem]:grid-cols-4">
            <Metric
              icon="cloud-cover"
              label="Cloud cover"
              value={
                atmospheric.cloudCoverPercent == null
                  ? 'Unavailable'
                  : `${formatPercent(atmospheric.cloudCoverPercent)} — ${describeCloudCover(atmospheric.cloudCoverPercent)}`
              }
            />
            <Metric icon="visibility" label="Visibility" value={formatDistance(atmospheric.visibilityMiles, unitSystem)} />
            <Metric icon="humidity" label="Humidity" value={formatPercent(atmospheric.humidityPercent)} />
            <Metric
              icon="dew-point"
              label="Dew point"
              value={formatTemperatureWithUnit(atmospheric.dewPointF, unitSystem)}
            />
          </dl>
        </div>
      )}
    </CardBoundary>
  );
}
