import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
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
    >
      {current && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-6xl font-bold tracking-tight text-slate-950"
                aria-label={describeTemperature(current.temperatureF, unitSystem)}
              >
                {formatTemperature(current.temperatureF, unitSystem)}
              </p>
              <p className="mt-2 text-base font-medium text-slate-700">{current.conditionLabel}</p>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800">
              Feels {formatTemperature(current.feelsLikeF, unitSystem)}
            </span>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Metric
              label="High / Low"
              value={`${formatTemperature(current.highF, unitSystem)} / ${formatTemperature(current.lowF, unitSystem)}`}
            />
            <Metric label="Wind" value={`${current.windDirection} ${formatSpeed(current.windMph, unitSystem)}`} />
            <Metric label="Rain chance" value={formatPercent(current.precipitationChance)} />
            <Metric label="Observed" value={formatTime(current.observedAt)} />
          </dl>
        </>
      )}
    </CardBoundary>
  );
}
