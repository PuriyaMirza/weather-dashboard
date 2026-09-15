import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';
import { LedgerDivider } from './ledger-divider';
import { formatSpeed } from '@/lib/weather/units';

const TITLE = 'Wind Detail';
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
      variant="ledger"
    >
      {wind && wind.speedMph != null && (
        <>
          <p className="ledger-label">
            {/* The ring marker is the palette's one secondary accent, used only for small markers
                like this — never for a whole reading. */}
            <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full border-[1.5px] border-blue align-middle" />
            Wind
          </p>
          <div className="mt-1.5 flex items-baseline gap-3">
            <p className="font-display text-[34px] leading-none text-ink">{formatSpeed(wind.speedMph, unitSystem)}</p>
            <p className="text-sm font-medium text-ink-soft">{describeWindStrength(wind.speedMph)}</p>
          </div>

          {wind.direction && (
            <p className="mt-2 text-xs text-ink-soft">
              Blowing from the {wind.direction}
              {wind.directionDegrees != null && ` (${Math.round(wind.directionDegrees)}°)`}
            </p>
          )}

          <LedgerDivider />

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="ledger-label">Gusts</dt>
              <dd className="font-display mt-1 text-lg leading-none text-ink">{formatSpeed(wind.gustMph, unitSystem)}</dd>
            </div>
            <div>
              <dt className="ledger-label">Direction</dt>
              <dd className="font-display mt-1 text-lg leading-none text-ink">{wind.direction ?? 'Unavailable'}</dd>
            </div>
          </dl>
        </>
      )}
    </CardBoundary>
  );
}
