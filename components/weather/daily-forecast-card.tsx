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

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={days.length === 0}
      loadingLabel="Loading the daily forecast…"
      unavailableLabel="Daily forecast data is unavailable."
      variant="ledger"
    >
      {days.length > 0 && (
        // A real table rather than styled divs: this is tabular data, and the semantics give
        // screen-reader users row/column context for free.
        <table className="w-full text-sm">
          <caption className="sr-only">Daily forecast for the week ahead</caption>
          <thead>
            <tr className="ledger-label text-left">
              <th scope="col" className="pb-2 font-medium">
                Day
              </th>
              <th scope="col" className="pb-2 font-medium">
                Conditions
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Rain
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                High / Low
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date} className="border-t border-hairline">
                <th scope="row" className="py-2.5 pr-3 text-left font-semibold text-ledger-ink">
                  {day.date === today ? 'Today' : formatWeekday(day.date)}
                </th>
                <td className="py-2.5 pr-3 text-ledger-ink">{day.conditionLabel}</td>
                <td className="py-2.5 pr-3 text-right text-ledger-ink">
                  {day.precipitationChance == null ? '—' : formatPercent(day.precipitationChance)}
                </td>
                <td className="py-2.5 text-right font-medium text-ledger-ink">
                  {formatTemperature(day.highF, unitSystem)}
                  <span className="text-ink-muted"> / {formatTemperature(day.lowF, unitSystem)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CardBoundary>
  );
}
