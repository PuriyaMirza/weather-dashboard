import type { AirQualityCategory } from '@/lib/weather/types';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary, LedgerMetric } from './card-frame';
import { formatIndex } from '@/lib/weather/units';

const TITLE = 'Air Quality Detail';
const DESCRIPTION = 'Current US AQI and the pollutants behind it.';

/**
 * EPA category guidance. Every band carries a name and a sentence, so the severity is never
 * carried by the colour swatch alone.
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

export function AirQualityCard({ data, isLoading, errorMessage }: WeatherCardProps) {
  const airQuality = data?.airQuality;
  const category = airQuality?.category ? CATEGORY[airQuality.category] : null;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!airQuality}
      loadingLabel="Loading air quality…"
      unavailableLabel="Air quality data is unavailable for this location."
      variant="ledger"
    >
      {airQuality && (
        <>
          {category && airQuality.usAqi != null ? (
            <div
              className="px-4 py-3"
              style={{
                background: `var(--${category.scale}-bg)`,
                color: `var(--${category.scale})`,
              }}
            >
              <p className="font-display text-3xl leading-none">
                {formatIndex(airQuality.usAqi)}
                <span className="ml-2 text-base font-semibold">{category.label}</span>
              </p>
              <p className="mt-1 text-sm">{category.advice}</p>
            </div>
          ) : (
            <p className="bg-cream-2 px-4 py-3 text-sm text-ink-muted">
              An overall index is unavailable; individual pollutants are shown below.
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <LedgerMetric label="PM2.5" value={formatConcentration(airQuality.pm2_5)} />
            <LedgerMetric label="PM10" value={formatConcentration(airQuality.pm10)} />
            <LedgerMetric label="Ozone" value={formatConcentration(airQuality.ozone)} />
            <LedgerMetric label="Nitrogen dioxide" value={formatConcentration(airQuality.nitrogenDioxide)} />
          </dl>

          <p className="mt-3 text-xs text-ink-muted">US AQI scale. Concentrations in micrograms per cubic metre.</p>
        </>
      )}
    </CardBoundary>
  );
}
