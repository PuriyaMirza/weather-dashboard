import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';
import { describeTemperature, formatHour, formatTemperature } from '@/lib/weather/units';

const TITLE = 'Hourly Temperature';
const DESCRIPTION = 'Temperature trend for the next several hours.';

export function HourlyTemperatureCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const timeZone = data?.location.timezone;
  const hourly = data?.hourly ?? [];

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={hourly.length === 0}
      loadingLabel="Loading hourly temperatures…"
      unavailableLabel="Hourly temperature data is unavailable."
      variant="ledger"
    >
      {hourly.length > 0 && (
        <>
          {/* The ledger strip: a row of hour columns, scrolling horizontally past the width the
              card affords rather than compressing below legibility. aria-hidden because the table
              below carries the same series to assistive tech — announcing both would be double. */}
          <div aria-hidden="true" className="-mx-1 flex flex-1 items-stretch divide-x divide-hairline overflow-x-auto px-1">
            {hourly.map((point) => (
              <div key={point.time} className="flex min-w-[3.5rem] flex-1 flex-col items-center gap-1.5 px-2 text-center">
                <span className="ledger-label whitespace-nowrap">{formatHour(point.time, timeZone)}</span>
                <span className="font-display text-lg leading-none text-ledger-ink">
                  {formatTemperature(point.temperatureF, unitSystem)}
                </span>
                <span className="text-[9.5px] whitespace-nowrap text-ink-muted">{point.precipitationChance}% rain</span>
              </div>
            ))}
          </div>

          {/* The strip's text equivalent. Not decorative: this is how the data is conveyed to
              screen-reader users, so it carries the full series rather than a summary. */}
          <table className="sr-only">
            <caption>Hourly temperatures</caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Temperature</th>
                <th scope="col">Feels like</th>
              </tr>
            </thead>
            <tbody>
              {hourly.map((point) => (
                <tr key={point.time}>
                  <th scope="row">{formatHour(point.time, timeZone)}</th>
                  <td>{describeTemperature(point.temperatureF, unitSystem)}</td>
                  <td>{describeTemperature(point.feelsLikeF, unitSystem)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-xs text-ink-muted">
            Range {formatTemperature(Math.min(...hourly.map((p) => p.temperatureF)), unitSystem)} to{' '}
            {formatTemperature(Math.max(...hourly.map((p) => p.temperatureF)), unitSystem)} over the next{' '}
            {hourly.length} hours.
          </p>
        </>
      )}
    </CardBoundary>
  );
}
