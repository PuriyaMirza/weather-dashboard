import type { WeatherCardProps } from './card-registry';
import { CardBoundary, Metric } from './card-frame';
import { formatSpeed } from '@/lib/weather/units';

const TITLE = 'Wind';
const DESCRIPTION = 'Current speed, gusts, and direction.';

/** Descriptive band so wind strength is conveyed in words, not only by a number. */
function describeWindStrength(milesPerHour: number): string {
  if (milesPerHour < 1) return 'Calm';
  if (milesPerHour < 8) return 'Light';
  if (milesPerHour < 19) return 'Moderate';
  if (milesPerHour < 32) return 'Fresh';
  if (milesPerHour < 47) return 'Strong';
  return 'Gale';
}

export function WindCard({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
  const wind = data?.wind;

  return (
    <CardBoundary
      title={TITLE}
      description={DESCRIPTION}
      isLoading={isLoading}
      errorMessage={errorMessage}
      isUnavailable={!wind || wind.speedMph == null}
      loadingLabel="Loading wind conditions…"
      unavailableLabel="Wind data is unavailable."
    >
      {wind && wind.speedMph != null && (
        <>
          <div className="flex items-baseline gap-3">
            <p className="text-5xl font-bold tracking-tight text-ink-strong">{formatSpeed(wind.speedMph, unitSystem)}</p>
            <p className="text-base font-medium text-ink">{describeWindStrength(wind.speedMph)}</p>
          </div>

          {wind.direction && (
            <p className="mt-2 text-sm text-muted">
              Blowing from the {wind.direction}
              {wind.directionDegrees != null && ` (${Math.round(wind.directionDegrees)}°)`}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Gusts" value={formatSpeed(wind.gustMph, unitSystem)} />
            <Metric label="Direction" value={wind.direction ?? 'Unavailable'} />
          </dl>
        </>
      )}
    </CardBoundary>
  );
}
