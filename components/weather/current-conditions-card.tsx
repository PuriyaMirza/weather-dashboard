import { Icon } from '@/components/ui/icon';
import { RingGauge } from '@/components/ui/ring-gauge';
import { conditionIcon } from '@/lib/weather/condition-icon';
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
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="font-display text-[3.25rem] leading-none text-primary @[20rem]:text-[4rem]"
                aria-label={describeTemperature(current.temperatureF, unitSystem)}
              >
                {formatTemperature(current.temperatureF, unitSystem)}
              </p>
              <p className="mt-2 flex items-center gap-1.5 type-body-md text-on-surface">
                <Icon
                  name={conditionIcon(current.condition, current.isDay ?? true)}
                  size={20}
                  className="shrink-0 text-secondary-fixed"
                />
                {current.conditionLabel}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-surface-container-highest/60 px-3 py-2">
              <span className="type-label-sm text-on-secondary-container uppercase">Rain</span>
              <RingGauge value={current.precipitationChance / 100} label={formatPercent(current.precipitationChance)} />
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-2 @[12rem]:grid-cols-2 @[32rem]:grid-cols-4">
            <Metric
              icon="thermostat"
              label="High / Low"
              value={`${formatTemperature(current.highF, unitSystem)} / ${formatTemperature(current.lowF, unitSystem)}`}
            />
            <Metric icon="feels-like" label="Feels like" value={formatTemperature(current.feelsLikeF, unitSystem)} />
            <Metric icon="air" label="Wind" value={`${current.windDirection} ${formatSpeed(current.windMph, unitSystem)}`} />
            <Metric icon="schedule" label="Observed" value={formatTime(current.observedAt, data?.location.timezone)} />
          </dl>
        </div>
      )}
    </CardBoundary>
  );
}
