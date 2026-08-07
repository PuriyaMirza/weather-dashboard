import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
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
    >
      {comfort && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Humidity" value={formatPercent(comfort.humidityPercent)} />
          <Metric label="Dew point" value={formatTemperatureWithUnit(comfort.dewPointF, unitSystem)} />
          <Metric label="UV index" value={formatIndex(comfort.uvIndex)} />
          <Metric label="Visibility" value={formatDistance(comfort.visibilityMiles, unitSystem)} />
          <Metric label="Pressure" value={formatPressure(comfort.pressureInHg, unitSystem)} />
          <Metric label="Air quality" value={formatIndex(comfort.airQualityIndex)} />
        </dl>
      )}
    </CardBoundary>
  );
}
