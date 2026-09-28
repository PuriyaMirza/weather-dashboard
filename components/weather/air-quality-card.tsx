import { ProgressBar } from '@/components/ui/progress-bar';
import type { AirQualityCategory } from '@/lib/weather/types';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
import { formatIndex } from '@/lib/weather/units';

const TITLE = 'Air Quality Detail';
const DESCRIPTION = 'Current US AQI and the pollutants behind it.';

/** Where the bar tops out: the EPA scale reaches "Hazardous" at 300, though the index can run past it. */
const AQI_BAR_MAX = 300;

/**
 * EPA category guidance. Every band carries a name and a sentence, so the severity is never
 * carried by the colour band alone.
 */
const CATEGORY: Record<AirQualityCategory, { label: string; advice: string; scale: string }> = {
  good: { label: 'Good', advice: 'Air quality is satisfactory.', scale: 'scale-1' },
  moderate: { label: 'Moderate', advice: 'Unusually sensitive people should consider limiting long outdoor exertion.', scale: 'scale-2' },
  sensitive: { label: 'Unhealthy for sensitive groups', advice: 'Sensitive groups should limit prolonged outdoor exertion.', scale: 'scale-3' },
  unhealthy: { label: 'Unhealthy', advice: 'Everyone should limit prolonged outdoor exertion.', scale: 'scale-4' },
  'very-unhealthy': { label: 'Very unhealthy', advice: 'Everyone should avoid prolonged outdoor exertion.', scale: 'scale-5' },
  hazardous: { label: 'Hazardous', advice: 'Everyone should avoid all outdoor exertion.', scale: 'scale-5' },
};

/** µg/m³ for particulates and gases — Open-Meteo's unit for all of these. */
function formatConcentration(value: number | null): string {
  if (value == null) return 'Unavailable';
  return `${value.toFixed(1)} µg/m³`;
}

export function AirQualityCard({ data, isLoading, errorMessage, isEditing, onRemove }: WeatherCardProps) {
  const airQuality = data?.airQuality;
  const category = airQuality?.category ? CATEGORY[airQuality.category] : null;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      icon="leaf"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!airQuality}
      loadingLabel="Loading air quality…"
      unavailableLabel="Air quality data is unavailable for this location."
    >
      {airQuality && (
        <div className="flex flex-1 flex-col justify-between gap-3">
          {category && airQuality.usAqi != null ? (
            <div>
              <div
                className="rounded-xl px-3 py-2.5"
                style={{ background: `var(--${category.scale}-bg)`, color: `var(--${category.scale})` }}
              >
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="type-headline-md">{formatIndex(airQuality.usAqi)}</span>
                  <span className="type-label-lg">{category.label}</span>
                </p>
                <p className="mt-0.5 type-body-sm">{category.advice}</p>
              </div>
              <ProgressBar value={airQuality.usAqi / AQI_BAR_MAX} className="mt-2" />
            </div>
          ) : (
            <p className="rounded-xl bg-surface-container-highest/60 px-3 py-2.5 type-body-sm text-on-surface-variant">
              An overall index is unavailable; individual pollutants are shown below.
            </p>
          )}

          <div>
            <dl className="grid grid-cols-1 gap-2 @[12rem]:grid-cols-2 @[32rem]:grid-cols-4">
              <Metric label="PM2.5" value={formatConcentration(airQuality.pm2_5)} />
              <Metric label="PM10" value={formatConcentration(airQuality.pm10)} />
              <Metric label="Ozone" value={formatConcentration(airQuality.ozone)} />
              <Metric label="Nitrogen dioxide" value={formatConcentration(airQuality.nitrogenDioxide)} />
            </dl>
            <p className="mt-2 type-body-sm text-on-surface-variant">
              US AQI scale. Concentrations in micrograms per cubic metre.
            </p>
          </div>
        </div>
      )}
    </CardBoundary>
  );
}
