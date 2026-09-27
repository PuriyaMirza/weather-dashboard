import { Icon } from '@/components/ui/icon';
import { RangeBar } from '@/components/ui/range-bar';
import { conditionIcon } from '@/lib/weather/condition-icon';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';
import { formatPercent, formatTemperature, formatWeekday } from '@/lib/weather/units';

const TITLE = 'Daily Forecast';
const DESCRIPTION = 'Highs, lows, and conditions for the week ahead.';

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

export function DailyForecastCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const days = data?.daily ?? [];
  const today = todayIsoDate(data?.location.timezone);
  // Every row's bar shares the week's scale, so a warm day visibly sits further right than a cold one.
  const weekMin = Math.min(...days.map((day) => day.lowF));
  const weekMax = Math.max(...days.map((day) => day.highF));

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      icon="calendar"
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={days.length === 0}
      loadingLabel="Loading the daily forecast…"
      unavailableLabel="Daily forecast data is unavailable."
    >
      {days.length > 0 && (
        // A real table rather than styled divs: this is tabular data, and the semantics give
        // screen-reader users row/column context for free. The header row is visually hidden —
        // the Forest rows speak for themselves to sighted readers — but stays in the table.
        <table className="w-full border-separate border-spacing-y-1">
          <caption className="sr-only">Daily forecast for the week ahead</caption>
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
                      <span className="sr-only type-body-sm whitespace-nowrap text-on-surface-variant @[32rem]:not-sr-only">
                        {day.conditionLabel}
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
                        min={weekMin}
                        max={weekMax}
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
      )}
    </CardBoundary>
  );
}
