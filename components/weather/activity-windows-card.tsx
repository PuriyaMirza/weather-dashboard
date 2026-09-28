import { Icon, type IconName } from '@/components/ui/icon';
import { findActivityWindows, type ActivityId } from '@/lib/weather/activity-windows';
import { formatHour } from '@/lib/weather/units';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';

const TITLE = 'Best Time To Go Out';
const DESCRIPTION = 'The best stretch of the next day for walking, running, cycling, and gardening.';

const ACTIVITY_ICON: Record<ActivityId, IconName> = {
  walk: 'walk',
  run: 'run',
  cycle: 'bike',
  garden: 'garden',
};

/**
 * The one module that answers a question rather than reporting a reading.
 *
 * Everything here is derived from the hourly series already on screen — no extra request. Where an
 * activity has no good window it says so plainly; a confident bad recommendation would be worse
 * than an honest blank.
 */
export function ActivityWindowsCard({
  data,
  isLoading,
  errorMessage,
  activities,
  isEditing,
  onRemove,
}: WeatherCardProps) {
  const timeZone = data?.location.timezone;
  // An empty selection means "unspecified", not "none" — see findActivityWindows.
  const outlooks = data ? findActivityWindows(data, activities) : [];
  // Nothing to reason about without an hourly series; that is "unavailable", not "no window".
  const isUnavailable = !data || data.hourly.length === 0;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      icon="forest"
      isEditing={isEditing}
      onRemove={onRemove}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={isUnavailable}
      loadingLabel="Working out the best times to go out…"
      unavailableLabel="Hourly data is unavailable, so no windows can be worked out."
    >
      {!isUnavailable && (
        <ul className="flex flex-col gap-2">
          {outlooks.map(({ definition, window }) => (
            <li
              key={definition.id}
              className="flex items-start gap-3 rounded-lg bg-surface-container-highest/60 px-3 py-2.5"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary-fixed">
                <Icon name={ACTIVITY_ICON[definition.id]} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="type-label-lg text-primary">{definition.label}</p>
                  {window && (
                    <p className="type-label-lg text-secondary-fixed">
                      {formatHour(window.start, timeZone)} – {formatHour(window.end, timeZone)}
                    </p>
                  )}
                </div>
                {window ? (
                  <p className="mt-0.5 type-body-sm text-on-surface-variant">
                    {window.reasons.join(' · ')}
                    {/* Stated rather than implied: a window can be perfectly good and still dark. */}
                    {window.darkFrom && ' · After sunset'}
                    {/* The daylight portion alone was enough to report on its own, but the
                        suitable stretch keeps going after dark — said, not dropped. */}
                    {window.extendsUntil && ` · Also fine until ${formatHour(window.extendsUntil, timeZone)} after dark`}
                  </p>
                ) : (
                  <>
                    <p className="mt-0.5 type-body-sm text-on-surface">No good window in the next day.</p>
                    <p className="type-body-sm text-on-surface-variant">{definition.description}</p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardBoundary>
  );
}
