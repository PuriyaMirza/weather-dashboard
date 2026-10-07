import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';
import { DailyForecastTable } from './daily-forecast-table';

const TITLE = 'Daily Forecast';
const DESCRIPTION = 'Highs, lows, and conditions for the week ahead.';

export function DailyForecastCard({
  data,
  isLoading,
  errorMessage,
  unitSystem,
  isEditing,
  onRemove,
}: WeatherCardProps) {
  const days = data?.daily ?? [];
  // Every row's bar shares the week's scale, so a warm day visibly sits further right than a cold one.
  const scale = {
    min: Math.min(...days.map((day) => day.lowF)),
    max: Math.max(...days.map((day) => day.highF)),
  };

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      icon="calendar"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={days.length === 0}
      loadingLabel="Loading the daily forecast…"
      unavailableLabel="Daily forecast data is unavailable."
    >
      {days.length > 0 && (
        <DailyForecastTable
          days={days}
          scale={scale}
          unitSystem={unitSystem}
          timeZone={data?.location.timezone}
          caption="Daily forecast for the week ahead"
        />
      )}
    </CardBoundary>
  );
}
