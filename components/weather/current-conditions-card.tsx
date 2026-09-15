import type { WeatherCardProps } from './card-registry';
import { CardBoundary, LedgerMetric } from './card-frame';
import { LedgerDivider } from './ledger-divider';
import { describeTemperature, formatPercent, formatSpeed, formatTemperature, formatTime } from '@/lib/weather/units';

const TITLE = 'Current Conditions';
const DESCRIPTION = 'Snapshot of temperature, conditions, wind, and precipitation chance.';

export function CurrentConditionsCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const current = data?.current;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!current}
      loadingLabel="Loading current conditions…"
      unavailableLabel="Current conditions are unavailable."
      variant="ledger"
    >
      {current && (
        <>
          <div className="flex items-end gap-3">
            <p
              className="font-display text-[68px] leading-[0.9] text-red"
              aria-label={describeTemperature(current.temperatureF, unitSystem)}
            >
              {formatTemperature(current.temperatureF, unitSystem)}
            </p>
            <p className="pb-1.5 text-sm font-medium text-ledger-ink">{current.conditionLabel}</p>
          </div>
          <p className="mt-1 text-xs text-ink-soft">Feels {formatTemperature(current.feelsLikeF, unitSystem)}</p>

          <LedgerDivider />

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <LedgerMetric
              label="High / Low"
              value={`${formatTemperature(current.highF, unitSystem)} / ${formatTemperature(current.lowF, unitSystem)}`}
            />
            <LedgerMetric label="Wind" value={`${current.windDirection} ${formatSpeed(current.windMph, unitSystem)}`} />
            <LedgerMetric label="Rain chance" value={formatPercent(current.precipitationChance)} />
            <LedgerMetric label="Observed" value={formatTime(current.observedAt, data?.location.timezone)} />
          </dl>
        </>
      )}
    </CardBoundary>
  );
}
