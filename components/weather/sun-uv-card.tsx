import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
import { formatDuration, formatIndex, formatTime } from '@/lib/weather/units';

const TITLE = 'Sun and UV';
const DESCRIPTION = 'Sunrise, sunset, daylight, and UV exposure.';

/**
 * WHO UV index exposure categories. Returned as words as well as a colour class so risk is never
 * communicated by colour alone.
 */
function describeUvIndex(uvIndex: number): { label: string; advice: string; scale: string } {
  if (uvIndex < 3) return { label: 'Low', advice: 'No protection needed.', scale: 'scale-1' };
  if (uvIndex < 6) return { label: 'Moderate', advice: 'Seek shade around midday.', scale: 'scale-2' };
  if (uvIndex < 8) return { label: 'High', advice: 'Sunscreen and a hat recommended.', scale: 'scale-3' };
  if (uvIndex < 11) return { label: 'Very high', advice: 'Avoid the sun in the middle of the day.', scale: 'scale-4' };
  return { label: 'Extreme', advice: 'Take full precautions; avoid sun exposure.', scale: 'scale-5' };
}

export function SunUvCard({ data, isLoading, errorMessage }: WeatherCardProps) {
  const timeZone = data?.location.timezone;
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
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: `var(--${uv.scale}-bg)`, color: `var(--${uv.scale})` }}
            >
              <p className="text-sm font-semibold">
                UV {formatIndex(uvNow)} — {uv.label}
              </p>
              <p className="mt-1 text-sm">{uv.advice}</p>
            </div>
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
              Current UV index is unavailable.
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Sunrise" value={formatTime(sun.sunrise, timeZone)} />
            <Metric label="Sunset" value={formatTime(sun.sunset, timeZone)} />
            <Metric label="Daylight" value={formatDuration(sun.daylightSeconds)} />
            <Metric label="Peak UV today" value={formatIndex(sun.uvIndexMax)} />
          </dl>
        </>
      )}
    </CardBoundary>
  );
}
