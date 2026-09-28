import { Icon } from '@/components/ui/icon';
import { describeWindStrength } from '@/lib/weather/metrics';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
import { formatSpeed } from '@/lib/weather/units';

const TITLE = 'Wind Detail';
const DESCRIPTION = 'Current speed, gusts, and direction.';

/**
 * A compass dial with an arrow pointing where the wind is going. Decorative: the direction is
 * always printed in words and degrees beside it.
 */
function WindDial({ degrees }: { degrees: number }) {
  // Meteorological degrees name where the wind comes *from*; the arrow shows where it blows to.
  const heading = (degrees + 180) % 360;
  return (
    <div
      aria-hidden="true"
      className="relative hidden h-16 w-16 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-highest/60 @[16rem]:flex"
    >
      <span className="absolute top-0.5 type-label-sm text-on-secondary-container">N</span>
      <svg width="28" height="28" viewBox="0 0 24 24" style={{ transform: `rotate(${heading}deg)` }}>
        <path d="M12 3l5 14-5-3-5 3z" fill="var(--secondary-fixed)" />
      </svg>
    </div>
  );
}

export function WindCard({ data, isLoading, errorMessage, unitSystem, isEditing, onRemove }: WeatherCardProps) {
  const wind = data?.wind;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      icon="air"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!wind || wind.speedMph == null}
      loadingLabel="Loading wind conditions…"
      unavailableLabel="Wind data is unavailable."
    >
      {wind && wind.speedMph != null && (
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="type-headline-md text-primary @[20rem]:text-[2.25rem] @[20rem]:leading-[2.75rem]">
                  {formatSpeed(wind.speedMph, unitSystem)}
                </p>
                <p className="rounded-full bg-surface-container-highest px-2.5 py-0.5 type-label-md text-secondary-fixed">
                  {describeWindStrength(wind.speedMph)}
                </p>
              </div>
              {wind.direction && (
                <p className="mt-1 type-body-sm text-secondary-fixed">
                  Blowing from the {wind.direction}
                  {wind.directionDegrees != null && ` (${Math.round(wind.directionDegrees)}°)`}
                </p>
              )}
            </div>
            {wind.directionDegrees != null && <WindDial degrees={wind.directionDegrees} />}
          </div>

          <dl className="grid grid-cols-1 gap-2 @[12rem]:grid-cols-2">
            <Metric icon="air" label="Gusts" value={formatSpeed(wind.gustMph, unitSystem)} />
            <Metric icon="compass" label="Direction" value={wind.direction ?? 'Unavailable'} />
          </dl>
        </div>
      )}
    </CardBoundary>
  );
}
