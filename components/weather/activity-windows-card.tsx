import { findActivityWindows } from '@/lib/weather/activity-windows';
import { formatHour } from '@/lib/weather/units';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';

const TITLE = 'Best Time To Go Out';
const DESCRIPTION = 'The best stretch of the next day for walking, running, cycling, and gardening.';

/**
 * The one module that answers a question rather than reporting a reading.
 *
 * Everything here is derived from the hourly series already on screen — no extra request. Where an
 * activity has no good window it says so plainly; a confident bad recommendation would be worse
 * than an honest blank.
 */
export function ActivityWindowsCard({ data, isLoading, errorMessage }: WeatherCardProps) {
  const timeZone = data?.location.timezone;
  const outlooks = data ? findActivityWindows(data) : [];
  // Nothing to reason about without an hourly series; that is "unavailable", not "no window".
  const isUnavailable = !data || data.hourly.length === 0;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={isUnavailable}
      loadingLabel="Working out the best times to go out…"
      unavailableLabel="Hourly data is unavailable, so no windows can be worked out."
    >
      {!isUnavailable && (
        <dl className="flex flex-col">
          {outlooks.map(({ definition, window }) => (
            <div
              key={definition.id}
              className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <dt className="eyebrow shrink-0 text-muted sm:w-24">{definition.label}</dt>
              <dd className="min-w-0">
                {window ? (
                  <>
                    <p className="font-display text-2xl leading-none text-ink-strong">
                      {formatHour(window.start, timeZone)} – {formatHour(window.end, timeZone)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {window.reasons.join(' · ')}
                      {/* Stated rather than implied: a window can be perfectly good and still dark. */}
                      {window.afterDark && ' · After sunset'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-ink">No good window in the next day.</p>
                    <p className="mt-1 text-xs text-muted">{definition.description}</p>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </CardBoundary>
  );
}
