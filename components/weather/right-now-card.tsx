import { CurrentConditionsSummary } from '@/components/dashboard/current-conditions-summary';
import { currentIsDay } from '@/lib/weather/atmosphere';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';

const TITLE = 'Right Now';

/**
 * The current temperature, condition and next-hour rain odds, as an arrangeable module rather than
 * a fixed part of the hero. `embedded` drops the summary's own label and surface, since
 * `CardBoundary` already supplies both.
 */
export function RightNowCard({ data, isLoading, errorMessage, unitSystem, isEditing, onRemove }: WeatherCardProps) {
  return (
    <CardBoundary
      title={TITLE}
      description="The temperature and sky at this moment, and the chance of rain in the next hour."
      icon="thermostat"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!data?.current}
      loadingLabel="Loading current conditions…"
      unavailableLabel="Current conditions are unavailable."
    >
      {data?.current && (
        <CurrentConditionsSummary data={data} isDay={currentIsDay(data)} unitSystem={unitSystem} embedded />
      )}
    </CardBoundary>
  );
}
