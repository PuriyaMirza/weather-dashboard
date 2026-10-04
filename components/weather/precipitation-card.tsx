'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
import { laterDayName } from '@/lib/weather/forecast-day';
import { formatHour, formatPercent, formatPrecipitation, toMillimetres } from '@/lib/weather/units';

const TITLE = 'Precipitation';
const DESCRIPTION = 'Chance and amount of rain or snow over the coming hours.';
/** The default view's horizon. A later day shows all of its hours instead — see below. */
const HOURS_SHOWN = 12;

export function PrecipitationCard({
  data,
  isLoading,
  errorMessage,
  unitSystem,
  forecastDay,
  isEditing,
  onRemove,
}: WeatherCardProps) {
  const timeZone = data?.location.timezone;
  const dayName = laterDayName(forecastDay);
  // Today's view is "what's coming", where the next 12 hours is the useful horizon. A later day
  // is a whole day someone is planning, and its total has to mean that day's total — cutting it at
  // noon would label half a day as the day.
  const hourly = dayName ? (data?.hourly ?? []) : (data?.hourly ?? []).slice(0, HOURS_SHOWN);

  const chartData = hourly.map((point) => ({
    time: formatHour(point.time, timeZone),
    chance: point.precipitationChance,
    amount:
      point.precipitationInches == null
        ? 0
        : unitSystem === 'metric'
          ? Number(toMillimetres(point.precipitationInches).toFixed(1))
          : Number(point.precipitationInches.toFixed(2)),
  }));

  const peak = hourly.reduce<{ chance: number; time: string } | null>(
    (best, point) => (best === null || point.precipitationChance > best.chance ? { chance: point.precipitationChance, time: point.time } : best),
    null,
  );

  const totalInches = hourly.reduce((sum, point) => sum + (point.precipitationInches ?? 0), 0);
  const anyAmountReported = hourly.some((point) => point.precipitationInches != null);

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      subtitle={dayName ?? undefined}
      icon="umbrella"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={hourly.length === 0}
      loadingLabel="Loading precipitation outlook…"
      unavailableLabel="Precipitation data is unavailable."
    >
      {hourly.length > 0 && (
        <>
          <dl className="grid grid-cols-1 gap-2 @[12rem]:grid-cols-2">
            <Metric label="Peak chance" value={peak ? `${formatPercent(peak.chance)} at ${formatHour(peak.time, timeZone)}` : '—'} />
            <Metric
              label={dayName ? `Total, ${dayName}` : `Total, next ${hourly.length}h`}
              value={anyAmountReported ? formatPrecipitation(totalInches, unitSystem) : 'Unavailable'}
            />
          </dl>

          <div className="mt-3 min-h-40 w-full flex-1" aria-hidden="true" inert>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Chance']}
                  cursor={{ fill: 'var(--surface-container-highest)', opacity: 0.5 }}
                  contentStyle={{
                    background: 'var(--surface-container-highest)',
                    border: 'none',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgb(var(--shadow-color) / 0.5)',
                  }}
                  labelStyle={{ color: 'var(--primary)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--on-surface)' }}
                />
                <Bar dataKey="chance" fill="var(--chart-bar)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* The wrapper, not the table, is what is visually hidden: a table cannot shrink to
              sr-only's 1px (its nowrap text sets its minimum width), and clip-path leaves its
              full width in the page's scrollable area — a sideways scroll on a phone. */}
          <div className="sr-only">
            <table>
              <caption>
                {dayName ? `Hourly precipitation chance and amount, ${dayName}` : 'Hourly precipitation chance and amount'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Chance</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {hourly.map((point) => (
                  <tr key={point.time}>
                    <th scope="row">{formatHour(point.time, timeZone)}</th>
                    <td>{formatPercent(point.precipitationChance)}</td>
                    <td>{formatPrecipitation(point.precipitationInches, unitSystem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardBoundary>
  );
}
