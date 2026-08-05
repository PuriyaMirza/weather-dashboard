'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeatherCardProps } from './card-registry';
import { CardFrame, CardState } from './card-frame';

export function HourlyTemperatureCard({ data, isLoading, errorMessage }: WeatherCardProps) {
  if (isLoading) return <CardFrame title="Hourly Temperature" description="Temperature trend for the next several hours."><CardState label="Loading hourly temperatures…" /></CardFrame>;
  if (errorMessage) return <CardFrame title="Hourly Temperature" description="Temperature trend for the next several hours."><CardState label={errorMessage} tone="error" /></CardFrame>;
  if (!data?.hourly.length) return <CardFrame title="Hourly Temperature" description="Temperature trend for the next several hours."><CardState label="Hourly temperature data is unavailable." /></CardFrame>;

  const chartData = data.hourly.map((point) => ({
    time: new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(new Date(point.time)),
    temperature: point.temperatureF,
    feelsLike: point.feelsLikeF,
  }));

  return (
    <CardFrame title="Hourly Temperature" description="Temperature trend for the next several hours.">
      <div className="h-72 w-full" aria-label="Hourly temperature chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12 }} unit="°" domain={['dataMin - 3', 'dataMax + 3']} />
            <Tooltip formatter={(value) => [`${value}°F`, 'Temperature']} labelClassName="text-slate-900" />
            <Area type="monotone" dataKey="temperature" stroke="#0369a1" fill="#bae6fd" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Hourly temperatures</caption>
        <tbody>{chartData.map((point) => <tr key={point.time}><th scope="row">{point.time}</th><td>{point.temperature} degrees Fahrenheit</td></tr>)}</tbody>
      </table>
    </CardFrame>
  );
}
