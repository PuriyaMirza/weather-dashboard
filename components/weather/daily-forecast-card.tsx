import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';
import { formatPercent, formatTemperature, formatWeekday } from '@/lib/weather/units';

const TITLE = 'Daily Forecast';
const DESCRIPTION = 'Highs, lows, and conditions for the week ahead.';

export function DailyForecastCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const days = data?.daily ?? [];

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={days.length === 0}
      loadingLabel="Loading the daily forecast…"
      unavailableLabel="Daily forecast data is unavailable."
    >
      {days.length > 0 && (
        // A real table rather than styled divs: this is tabular data, and the semantics give
        // screen-reader users row/column context for free.
        <table className="w-full text-sm">
          <caption className="sr-only">Daily forecast for the week ahead</caption>
          <thead>
            <tr className="text-left text-muted">
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
              <tr key={day.date} className="border-t border-line">
                <th scope="row" className="py-2.5 pr-3 text-left font-semibold text-ink">
                  {formatWeekday(day.date)}
                </th>
                <td className="py-2.5 pr-3 text-ink">{day.conditionLabel}</td>
                <td className="py-2.5 pr-3 text-right text-ink">
                  {day.precipitationChance == null ? '—' : formatPercent(day.precipitationChance)}
                </td>
                <td className="py-2.5 text-right font-medium text-ink">
                  {formatTemperature(day.highF, unitSystem)}
                  <span className="text-muted"> / {formatTemperature(day.lowF, unitSystem)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CardBoundary>
  );
}
