import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
import { formatDuration, formatIndex, formatTime } from '@/lib/weather/units';

const TITLE = 'Sun and UV';
const DESCRIPTION = 'Sunrise, sunset, daylight, and UV exposure.';

/**
 * WHO UV index exposure categories. Returned as words as well as a colour class so risk is never
 * communicated by colour alone.
 */
function describeUvIndex(uvIndex: number): { label: string; advice: string; className: string } {
  if (uvIndex < 3) return { label: 'Low', advice: 'No protection needed.', className: 'bg-emerald-100 text-emerald-900' };
  if (uvIndex < 6) return { label: 'Moderate', advice: 'Seek shade around midday.', className: 'bg-amber-100 text-amber-900' };
  if (uvIndex < 8) return { label: 'High', advice: 'Sunscreen and a hat recommended.', className: 'bg-orange-100 text-orange-900' };
  if (uvIndex < 11) return { label: 'Very high', advice: 'Avoid the sun in the middle of the day.', className: 'bg-rose-100 text-rose-900' };
  return { label: 'Extreme', advice: 'Take full precautions; avoid sun exposure.', className: 'bg-purple-100 text-purple-900' };
}

export function SunUvCard({ data, isLoading, errorMessage }: WeatherCardProps) {
  const sun = data?.sun;
  const uvNow = sun?.uvIndexNow ?? null;
  const uv = uvNow == null ? null : describeUvIndex(uvNow);

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!sun}
      loadingLabel="Loading sun and UV details…"
      unavailableLabel="Sun and UV data is unavailable."
    >
      {sun && (
        <>
          {uv && uvNow != null ? (
            <div className={`rounded-2xl px-4 py-3 ${uv.className}`}>
              <p className="text-sm font-semibold">
                UV {formatIndex(uvNow)} — {uv.label}
              </p>
              <p className="mt-1 text-sm">{uv.advice}</p>
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Current UV index is unavailable.
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Sunrise" value={formatTime(sun.sunrise)} />
            <Metric label="Sunset" value={formatTime(sun.sunset)} />
            <Metric label="Daylight" value={formatDuration(sun.daylightSeconds)} />
            <Metric label="Peak UV today" value={formatIndex(sun.uvIndexMax)} />
          </dl>
        </>
      )}
    </CardBoundary>
  );
}
