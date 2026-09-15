import type { MetricModuleDefinition } from '@/lib/weather/metrics';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary, type CardFrameVariant } from './card-frame';

/**
 * Renders a single-reading module from its metric definition.
 *
 * One component rather than a dozen near-identical card files: the modules differ only in which
 * field they read and how it is formatted, both of which live in `lib/weather/metrics.ts`. Adding
 * a reading is then a table entry, not a new file, and every reading gets the same four states,
 * the same typography, and the same spoken alternative for free.
 *
 * `variant` is a display-only opt-in — currently only `feels-like` passes 'ledger' (see
 * `card-registry.tsx`), so the other readings built from this same factory are unaffected.
 */
export function createStatModule(definition: MetricModuleDefinition, variant: CardFrameVariant = 'default') {
  function StatModule({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
    const reading = data ? definition.read(data, unitSystem) : null;

    return (
      <CardBoundary
        title={definition.title}
        description={definition.description}
        isLoading={isLoading}
        errorMessage={errorMessage}
        isUnavailable={!reading}
        loadingLabel={`Loading ${definition.title.toLowerCase()}…`}
        unavailableLabel={`${definition.title} is unavailable.`}
        variant={variant}
      >
        {reading &&
          (variant === 'ledger' ? (
            <div className="flex flex-1 flex-col justify-between gap-4">
              <p className="font-display text-[34px] leading-none text-ink" aria-label={reading.spoken}>
                {reading.value}
              </p>
              <div>
                {reading.detail && <p className="text-xs text-ink-soft">{reading.detail}</p>}
                {reading.qualifier && <p className="ledger-label mt-1">{reading.qualifier}</p>}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-between gap-4">
              <p
                className="font-display text-5xl leading-[0.85] tracking-tight text-ink-strong tabular-nums"
                // The display form is terse by design; screen readers get the spelled-out version,
                // because "72°" is otherwise announced as "seventy-two degree".
                aria-label={reading.spoken}
              >
                {reading.value}
              </p>
              <div>
                {reading.detail && <p className="text-sm text-ink">{reading.detail}</p>}
                {reading.qualifier && <p className="eyebrow mt-1 text-muted">{reading.qualifier}</p>}
              </div>
            </div>
          ))}
      </CardBoundary>
    );
  }

  StatModule.displayName = `StatModule(${definition.id})`;
  return StatModule;
}
