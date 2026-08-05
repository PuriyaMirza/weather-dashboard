import type { WeatherCardProps } from './card-registry';
import { CardFrame, CardState } from './card-frame';

export function CurrentConditionsCard({ data, isLoading, errorMessage }: WeatherCardProps) {
  if (isLoading) return <CardFrame title="Current Conditions" description="Snapshot of temperature, conditions, wind, and precipitation chance."><CardState label="Loading current conditions…" /></CardFrame>;
  if (errorMessage) return <CardFrame title="Current Conditions" description="Snapshot of temperature, conditions, wind, and precipitation chance."><CardState label={errorMessage} tone="error" /></CardFrame>;
  if (!data?.current) return <CardFrame title="Current Conditions" description="Snapshot of temperature, conditions, wind, and precipitation chance."><CardState label="Current conditions are unavailable." /></CardFrame>;

  const current = data.current;
  return (
    <CardFrame title="Current Conditions" description="Snapshot of temperature, conditions, wind, and precipitation chance.">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-6xl font-bold tracking-tight text-slate-950" aria-label={`${current.temperatureF} degrees Fahrenheit`}>{current.temperatureF}°</p>
          <p className="mt-2 text-base font-medium text-slate-700">{current.conditionLabel}</p>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800">Feels {current.feelsLikeF}°</span>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <Metric label="High / Low" value={`${current.highF}° / ${current.lowF}°`} />
        <Metric label="Wind" value={`${current.windDirection} ${current.windMph} mph`} />
        <Metric label="Rain chance" value={`${current.precipitationChance}%`} />
        <Metric label="Observed" value={new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(current.observedAt))} />
      </dl>
    </CardFrame>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>;
}
