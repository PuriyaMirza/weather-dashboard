'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';
import { describeTemperature, formatHour, formatTemperature, toCelsius } from '@/lib/weather/units';

const TITLE = 'Hourly Temperature';
const DESCRIPTION = 'Temperature trend for the next several hours.';

export function HourlyTemperatureCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const timeZone = data?.location.timezone;
  const hourly = data?.hourly ?? [];

  const chartData = hourly.map((point) => ({
    time: formatHour(point.time, timeZone),
    temperature: unitSystem === 'metric' ? Math.round(toCelsius(point.temperatureF)) : Math.round(point.temperatureF),
    feelsLike: unitSystem === 'metric' ? Math.round(toCelsius(point.feelsLikeF)) : Math.round(point.feelsLikeF),
    rawTemperature: point.temperatureF,
  }));

  const unitSuffix = unitSystem === 'metric' ? '°C' : '°F';

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={hourly.length === 0}
      loadingLabel="Loading hourly temperatures…"
      unavailableLabel="Hourly temperature data is unavailable."
    >
      {hourly.length > 0 && (
        <>
          {/* aria-hidden: the chart is decorative for assistive tech, which reads the table below
              instead. Without this the SVG's text nodes are announced as meaningless fragments. */}
          <div className="h-72 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
                  unit="°"
                  domain={['dataMin - 3', 'dataMax + 3']}
                />
                <Tooltip formatter={(value) => [`${value}${unitSuffix}`, 'Temperature']} labelClassName="text-ink" />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="var(--chart-line)"
                  fill="var(--chart-fill)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* The chart's text equivalent. Not decorative: this is how the data is conveyed to
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

          <p className="mt-3 text-sm text-muted">
            Range {formatTemperature(Math.min(...hourly.map((p) => p.temperatureF)), unitSystem)} to{' '}
            {formatTemperature(Math.max(...hourly.map((p) => p.temperatureF)), unitSystem)} over the next{' '}
            {hourly.length} hours.
          </p>
        </>
      )}
    </CardBoundary>
  );
}
