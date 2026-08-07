'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
import { formatPercent, formatPrecipitation, toMillimetres } from '@/lib/weather/units';

const TITLE = 'Precipitation';
const DESCRIPTION = 'Chance and amount of rain or snow over the coming hours.';
const HOURS_SHOWN = 12;

function hourLabel(time: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(new Date(time));
}

export function PrecipitationCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const hourly = (data?.hourly ?? []).slice(0, HOURS_SHOWN);

  const chartData = hourly.map((point) => ({
    time: hourLabel(point.time),
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
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={hourly.length === 0}
      loadingLabel="Loading precipitation outlook…"
      unavailableLabel="Precipitation data is unavailable."
    >
      {hourly.length > 0 && (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Peak chance" value={peak ? `${formatPercent(peak.chance)} at ${hourLabel(peak.time)}` : '—'} />
            <Metric
              label={`Total, next ${hourly.length}h`}
              value={anyAmountReported ? formatPrecipitation(totalInches, unitSystem) : 'Unavailable'}
            />
          </dl>

          <div className="mt-4 h-56 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip formatter={(value) => [`${value}%`, 'Chance']} labelClassName="text-slate-900" />
                <Bar dataKey="chance" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="sr-only">
            <caption>Hourly precipitation chance and amount</caption>
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
                  <th scope="row">{hourLabel(point.time)}</th>
                  <td>{formatPercent(point.precipitationChance)}</td>
                  <td>{formatPrecipitation(point.precipitationInches, unitSystem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </CardBoundary>
  );
}
