import { Icon } from '@/components/ui/icon';
import { RangeBar } from '@/components/ui/range-bar';
import { conditionIcon } from '@/lib/weather/condition-icon';
import type { DailyForecastDay } from '@/lib/weather/types';
import { formatPercent, formatTemperature, formatWeekday, type UnitSystem } from '@/lib/weather/units';

/** The span every row's range bar is drawn against, in Fahrenheit like the days themselves. */
export interface TemperatureScale {
  min: number;
  max: number;
}

interface DailyForecastTableProps {
  days: DailyForecastDay[];
  /**
   * Passed in rather than computed from `days`, so two tables set side by side can share one scale
   * — each scaled to its own week would draw a mild week and a hot one as the same full bar.
   */
  scale: TemperatureScale;
  unitSystem: UnitSystem;
  /** The forecast location's IANA zone, which decides which row is "Today". */
  timeZone?: string;
  /** Visually hidden; names the table for assistive tech. */
  caption: string;
}

/**
 * Today's date as an ISO `YYYY-MM-DD`, in the forecast location's own timezone rather than the
 * viewer's — matches how `day.date` is produced, so a visitor in one timezone still sees "Today"
 * on the right row rather than tomorrow's or yesterday's.
 */
function todayIsoDate(timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date());
  }
}

/**
 * One row per forecast day: the day, its condition, low–bar–high on `scale`, and the rain chance.
 *
 * Adapts to its nearest `@container` ancestor rather than the viewport — the condition words and
 * the range bar appear only once there is room for them — so the same table works in a small
 * module, a large one, and a half-width Compare column.
 */
export function DailyForecastTable({ days, scale, unitSystem, timeZone, caption }: DailyForecastTableProps) {
  const today = todayIsoDate(timeZone);

  return (
    // A real table rather than styled divs: this is tabular data, and the semantics give
    // screen-reader users row/column context for free. The header row is visually hidden —
    // the Forest rows speak for themselves to sighted readers — but stays in the table.
    <table className="w-full border-separate border-spacing-y-1">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="sr-only">
            Day
          </th>
          <th scope="col" className="sr-only">
            Conditions
          </th>
          <th scope="col" className="sr-only">
            Low and high
          </th>
          <th scope="col" className="sr-only">
            Rain
          </th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <tr key={day.date}>
              <th
                scope="row"
                className={`w-12 py-1 pr-2 text-left type-label-md whitespace-nowrap uppercase ${
                  isToday ? 'font-bold text-secondary-fixed' : 'text-on-surface'
                }`}
              >
                {isToday ? 'Today' : formatWeekday(day.date)}
              </th>
              <td className="py-1 pr-2">
                <span className="flex items-center gap-2">
                  <Icon
                    name={conditionIcon(day.condition)}
                    size={20}
                    className={`shrink-0 ${isToday ? 'text-secondary-fixed' : 'text-secondary'}`}
                  />
                  {/* Icon-only on a narrow tile; the words appear once there is room, and are
                      always there for assistive tech. */}
                  {/* nowrap on an inner span: `not-sr-only` resets white-space, which let
                      "Partly cloudy" break over two lines and double the row's height. */}
                  <span className="sr-only type-body-sm text-on-surface-variant @[32rem]:not-sr-only">
                    <span className="whitespace-nowrap">{day.conditionLabel}</span>
                  </span>
                </span>
              </td>
              <td className="w-full py-1 pr-2">
                {/* One spoken phrase for the cell; the visual low–bar–high group below is
                    hidden from assistive tech so the numbers aren't read twice. */}
                <span className="sr-only">
                  Low {formatTemperature(day.lowF, unitSystem)}, high {formatTemperature(day.highF, unitSystem)}
                </span>
                <span aria-hidden="true" className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-right type-label-sm text-on-surface-variant">
                    {formatTemperature(day.lowF, unitSystem)}
                  </span>
                  <RangeBar
                    min={scale.min}
                    max={scale.max}
                    low={day.lowF}
                    high={day.highF}
                    tone={isToday ? 'secondary-fixed' : 'secondary'}
                    className="hidden min-w-8 flex-1 @[16rem]:block"
                  />
                  <span className="w-8 shrink-0 type-label-md font-bold text-primary">
                    {formatTemperature(day.highF, unitSystem)}
                  </span>
                </span>
              </td>
              <td className="py-1 text-right type-label-sm whitespace-nowrap text-on-surface-variant">
                {day.precipitationChance == null ? '—' : formatPercent(day.precipitationChance)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
