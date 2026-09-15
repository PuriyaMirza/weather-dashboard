import type { WeatherCardProps } from './card-registry';
import { CardBoundary, LedgerMetric } from './card-frame';
import {
  formatDistance,
  formatIndex,
  formatPercent,
  formatPressure,
  formatTemperatureWithUnit,
} from '@/lib/weather/units';

const TITLE = 'Comfort';
const DESCRIPTION = 'Humidity, dew point, UV, visibility, pressure, and air quality.';

export function ComfortCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const comfort = data?.comfort;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!comfort}
      loadingLabel="Loading comfort metrics…"
      unavailableLabel="Comfort metrics are unavailable."
      variant="ledger"
    >
      {comfort && (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <LedgerMetric label="Humidity" value={formatPercent(comfort.humidityPercent)} />
          <LedgerMetric label="Dew point" value={formatTemperatureWithUnit(comfort.dewPointF, unitSystem)} />
          <LedgerMetric label="UV index" value={formatIndex(comfort.uvIndex)} />
          <LedgerMetric label="Visibility" value={formatDistance(comfort.visibilityMiles, unitSystem)} />
          <LedgerMetric label="Pressure" value={formatPressure(comfort.pressureInHg, unitSystem)} />
          <LedgerMetric label="Air quality" value={formatIndex(comfort.airQualityIndex)} />
        </dl>
      )}
    </CardBoundary>
  );
}
