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
export function ActivityWindowsCard({ data, isLoading, errorMessage, activities }: WeatherCardProps) {
  const timeZone = data?.location.timezone;
  // An empty selection means "unspecified", not "none" — see findActivityWindows.
  const outlooks = data ? findActivityWindows(data, activities) : [];
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
      variant="ledger"
    >
      {!isUnavailable && (
        <dl className="flex flex-col divide-y divide-hairline">
          {outlooks.map(({ definition, window }) => (
            <div key={definition.id} className="flex flex-col gap-1 py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="ledger-label">{definition.label}</dt>
                {window && (
                  <dd className="font-display min-w-0 text-xl leading-none text-ledger-ink">
                    {formatHour(window.start, timeZone)} – {formatHour(window.end, timeZone)}
                  </dd>
                )}
              </div>
              {window ? (
                <p className="text-[11.5px] leading-relaxed text-ink-soft">
                  {window.reasons.join(' · ')}
                  {/* Stated rather than implied: a window can be perfectly good and still dark. */}
                  {window.darkFrom && ' · After sunset'}
                  {/* The daylight portion alone was enough to report on its own, but the
                      suitable stretch keeps going after dark — said, not dropped. */}
                  {window.extendsUntil && ` · Also fine until ${formatHour(window.extendsUntil, timeZone)} after dark`}
                </p>
              ) : (
                <>
                  <p className="text-sm text-ink-muted">No good window in the next day.</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{definition.description}</p>
                </>
              )}
            </div>
          ))}
        </dl>
      )}
    </CardBoundary>
  );
}
