import { HourlyStrip } from '@/components/dashboard/hourly-strip';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';

const TITLE = 'Next Hours';

/**
 * Wraps `HourlyStrip` in the same four states every other card gets, so the pill row can live in
 * the arrangeable grid instead of being fixed inside the hero. `embedded` on the strip itself
 * drops its own "Next Hours" heading, since `CardBoundary` already renders one.
 */
export function NextHoursCard({ data, isLoading, errorMessage, unitSystem, isEditing, onRemove }: WeatherCardProps) {
  return (
    <CardBoundary
      title={TITLE}
      description="Temperature and rain chance for the next several hours, hour by hour."
      icon="schedule"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!data?.hourly?.length}
      loadingLabel="Loading the next hours…"
      unavailableLabel="Hourly data is unavailable."
    >
      {data && <HourlyStrip data={data} unitSystem={unitSystem} embedded />}
    </CardBoundary>
  );
}
