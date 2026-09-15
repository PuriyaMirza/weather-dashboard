import type { PressureTrend } from '@/lib/weather/types';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary, LedgerMetric } from './card-frame';
import { LedgerDivider } from './ledger-divider';
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
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!atmospheric}
      loadingLabel="Loading atmospheric details…"
      unavailableLabel="Atmospheric data is unavailable."
      variant="ledger"
    >
      {atmospheric && (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-4xl leading-none text-ledger-ink">
              {formatPressure(atmospheric.pressureInHg, unitSystem)}
            </p>
            {atmospheric.pressureTrend && (
              <span className="bg-cream-2 px-3 py-1 text-sm font-semibold text-ledger-ink">
                {PRESSURE_TREND_LABEL[atmospheric.pressureTrend]}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-soft">Sea-level pressure</p>

          <LedgerDivider />

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <LedgerMetric
              label="Cloud cover"
              value={
                atmospheric.cloudCoverPercent == null
                  ? 'Unavailable'
                  : `${formatPercent(atmospheric.cloudCoverPercent)} — ${describeCloudCover(atmospheric.cloudCoverPercent)}`
              }
            />
            <LedgerMetric label="Visibility" value={formatDistance(atmospheric.visibilityMiles, unitSystem)} />
            <LedgerMetric label="Humidity" value={formatPercent(atmospheric.humidityPercent)} />
            <LedgerMetric label="Dew point" value={formatTemperatureWithUnit(atmospheric.dewPointF, unitSystem)} />
          </dl>
        </>
      )}
    </CardBoundary>
  );
}
