import { Icon, type IconName } from '@/components/ui/icon';
import { RingGauge } from '@/components/ui/ring-gauge';
import { conditionIcon } from '@/lib/weather/condition-icon';
import type { WeatherDashboardData } from '@/lib/weather/types';
import {
  describeTemperature,
  formatPercent,
  formatPressure,
  formatTemperature,
  type UnitSystem,
} from '@/lib/weather/units';

/** Stands in for any missing reading — a dash, never a fabricated number. */
export const MISSING = '—';

interface CurrentConditionsSummaryProps {
  data: WeatherDashboardData;
  isDay: boolean;
  unitSystem: UnitSystem;
}

interface QuickStat {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  /** Spoken form, where the visible abbreviation would read poorly. */
  spokenLabel?: string;
}

/** "30.08 inHg" → { value: "30.08", unit: "inHg" }; a lone dash stays whole. */
function splitUnit(formatted: string): Pick<QuickStat, 'value' | 'unit'> {
  const space = formatted.lastIndexOf(' ');
  return space < 0 ? { value: formatted } : { value: formatted.slice(0, space), unit: formatted.slice(space + 1) };
}

function temperatureOrMissing(fahrenheit: number | null | undefined, unitSystem: UnitSystem): string {
  return fahrenheit == null ? MISSING : formatTemperature(fahrenheit, unitSystem);
}

/**
 * "Right now": the current temperature, the next hour's rain odds and four quick readings.
 *
 * Dew point and pressure come from the atmospheric block first and the comfort block second, the
 * same fields the grid's modules read, so the two never disagree on screen.
 */
export function CurrentConditionsSummary({ data, isDay, unitSystem }: CurrentConditionsSummaryProps) {
  const current = data.current;
  if (!current) return null;

  const dewPointF = data.atmospheric?.dewPointF ?? data.comfort?.dewPointF ?? null;
  const pressureInHg = data.atmospheric?.pressureInHg ?? data.comfort?.pressureInHg ?? null;
  const rainChance = current.precipitationChance;

  const stats: QuickStat[] = [
    {
      icon: 'thermostat',
      label: 'Range',
      spokenLabel: 'High and low',
      value: `${temperatureOrMissing(current.highF, unitSystem)} / ${temperatureOrMissing(current.lowF, unitSystem)}`,
    },
    { icon: 'feels-like', label: 'Feels', spokenLabel: 'Feels like', value: temperatureOrMissing(current.feelsLikeF, unitSystem) },
    { icon: 'dew-point', label: 'Dew', spokenLabel: 'Dew point', value: temperatureOrMissing(dewPointF, unitSystem) },
    {
      icon: 'pressure',
      label: 'Barom.',
      spokenLabel: 'Pressure',
      ...splitUnit(pressureInHg == null ? MISSING : formatPressure(pressureInHg, unitSystem)),
    },
  ];

  return (
    <div className="flex flex-col justify-between gap-5 rounded-2xl bg-surface-container-low p-5 shadow-card">
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

      <dl className="grid grid-cols-4 gap-2 rounded-xl bg-surface-container/60 p-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col items-center text-center">
            <dt className="flex flex-col items-center gap-0.5 type-label-sm text-on-secondary-container">
              <Icon name={stat.icon} size={18} className="text-secondary" />
              <span aria-hidden={stat.spokenLabel ? true : undefined}>{stat.label}</span>
              {stat.spokenLabel && <span className="sr-only">{stat.spokenLabel}</span>}
            </dt>
            <dd className="mt-0.5 type-label-md font-bold text-primary tabular-nums">
              {stat.value}
              {stat.unit && (
                <>
                  {' '}
                  {/* Its own line: "30.08 inHg" doesn't fit a quarter of a phone-width strip. */}
                  <span className="block type-label-sm font-normal text-on-secondary-container">{stat.unit}</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
