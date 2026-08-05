import type { WeatherCardProps } from './card-registry';
import { CardFrame, CardState } from './card-frame';

export function ComfortCard({ data, isLoading, errorMessage }: WeatherCardProps) {
  if (isLoading) return <CardFrame title="Comfort" description="Humidity, dew point, UV, visibility, pressure, and air quality."><CardState label="Loading comfort metrics…" /></CardFrame>;
  if (errorMessage) return <CardFrame title="Comfort" description="Humidity, dew point, UV, visibility, pressure, and air quality."><CardState label={errorMessage} tone="error" /></CardFrame>;
  if (!data?.comfort) return <CardFrame title="Comfort" description="Humidity, dew point, UV, visibility, pressure, and air quality."><CardState label="Comfort metrics are unavailable." /></CardFrame>;

  const comfort = data.comfort;
  const metrics = [
    ['Humidity', `${comfort.humidityPercent}%`],
    ['Dew point', `${comfort.dewPointF}°F`],
    ['UV index', comfort.uvIndex === null ? 'Unavailable' : String(comfort.uvIndex)],
    ['Visibility', `${comfort.visibilityMiles} mi`],
    ['Pressure', `${comfort.pressureInHg} inHg`],
    ['Air quality', comfort.airQualityIndex === null ? 'Unavailable' : `AQI ${comfort.airQualityIndex}`],
  ];

  return (
    <CardFrame title="Comfort" description="Humidity, dew point, UV, visibility, pressure, and air quality.">
      <dl className="grid grid-cols-2 gap-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50 p-3">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
    </CardFrame>
  );
}
