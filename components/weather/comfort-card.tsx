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

export function ComfortCard({ data, isLoading, errorMessage, unitSystem, isEditing, onRemove }: WeatherCardProps) {
  const comfort = data?.comfort;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      icon="feels-like"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!comfort}
      loadingLabel="Loading comfort metrics…"
      unavailableLabel="Comfort metrics are unavailable."
    >
      {comfort && (
        <dl className="grid grid-cols-1 gap-2 @[12rem]:grid-cols-2 @[32rem]:grid-cols-3">
          <Metric icon="humidity" label="Humidity" value={formatPercent(comfort.humidityPercent)} />
          <Metric icon="dew-point" label="Dew point" value={formatTemperatureWithUnit(comfort.dewPointF, unitSystem)} />
          <Metric icon="uv" label="UV index" value={formatIndex(comfort.uvIndex)} />
          <Metric icon="visibility" label="Visibility" value={formatDistance(comfort.visibilityMiles, unitSystem)} />
          <Metric icon="pressure" label="Pressure" value={formatPressure(comfort.pressureInHg, unitSystem)} />
          <Metric icon="leaf" label="Air quality" value={formatIndex(comfort.airQualityIndex)} />
        </dl>
      )}
    </CardBoundary>
  );
}
