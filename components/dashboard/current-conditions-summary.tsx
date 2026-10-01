import { Icon } from '@/components/ui/icon';
import { RingGauge } from '@/components/ui/ring-gauge';
import { conditionIcon } from '@/lib/weather/condition-icon';
import type { WeatherDashboardData } from '@/lib/weather/types';
import { describeTemperature, formatPercent, formatTemperature, type UnitSystem } from '@/lib/weather/units';

interface CurrentConditionsSummaryProps {
  data: WeatherDashboardData;
  isDay: boolean;
  unitSystem: UnitSystem;
}

/**
 * "Right now": the current temperature and the next hour's rain odds. The quick readings that used
 * to sit under them are the user's pinned favourites and live in the hero's card instead.
 */
export function CurrentConditionsSummary({ data, isDay, unitSystem }: CurrentConditionsSummaryProps) {
  const current = data.current;
  if (!current) return null;

  const rainChance = current.precipitationChance;

  return (
    <div className="flex flex-col justify-center gap-5 rounded-2xl bg-surface-container-low p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <p className="type-label-sm uppercase text-secondary">Right now</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span aria-hidden="true" className="type-display-lg text-primary tabular-nums">
              {formatTemperature(current.temperatureF, unitSystem)}
            </span>
            <span aria-hidden="true" className="type-headline-sm font-light text-on-surface-variant">
              {unitSystem === 'metric' ? 'C' : 'F'}
            </span>
            <span className="sr-only">{describeTemperature(current.temperatureF, unitSystem)}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 type-body-sm text-secondary-fixed">
            <Icon name={conditionIcon(current.condition, isDay)} size={16} className="shrink-0" />
            {current.conditionLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center rounded-xl bg-surface-container-high/80 px-3 py-2.5 text-center shadow-card">
          <p className="type-label-sm uppercase text-on-secondary-container">Rain</p>
          <div className="my-1">
            <RingGauge value={rainChance / 100} label={formatPercent(rainChance)} />
          </div>
          <p className="type-label-sm text-secondary">Next hour</p>
        </div>
      </div>

    </div>
  );
}
