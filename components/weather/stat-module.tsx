import { ProgressBar } from '@/components/ui/progress-bar';
import type { MetricModuleDefinition } from '@/lib/weather/metrics';
import type { WeatherCardProps } from './card-registry';
import { CardBoundary } from './card-frame';

/**
 * Renders a single-reading module (the Forest "Metric Tile") from its metric definition.
 *
 * One component rather than a dozen near-identical card files: the modules differ only in which
 * field they read and how it is formatted, both of which live in `lib/weather/metrics.ts`. Adding
 * a reading is then a table entry, not a new file, and every reading gets the same four states,
 * the same typography, and the same spoken alternative for free.
 */
export function createStatModule(definition: MetricModuleDefinition) {
  function StatModule({ data, isLoading, errorMessage, unitSystem }: WeatherCardProps) {
    const reading = data ? definition.read(data, unitSystem) : null;

    return (
      <CardBoundary
        title={definition.title}
        description={definition.description}
        icon={definition.icon}
        isLoading={isLoading}
        errorMessage={errorMessage}
        isUnavailable={!reading}
        loadingLabel={`Loading ${definition.title.toLowerCase()}…`}
        unavailableLabel={`${definition.title} is unavailable.`}
      >
        {reading && (
          <div className="flex flex-1 flex-col justify-between gap-3">
            <div className="min-w-0">
              <p
                className="flex flex-wrap items-baseline gap-x-1.5"
                // The display form is terse by design; screen readers get the spelled-out version,
                // because "72°" is otherwise announced as "seventy-two degree".
                aria-label={reading.spoken}
              >
                <span className="type-headline-md text-primary @[20rem]:text-[2.75rem] @[20rem]:leading-[3rem]">
                  {reading.value}
                </span>
                {/* A real space, so the reading's text is "8 mph", not "8mph", wherever it is read. */}
                {reading.unit && ' '}
                {reading.unit && (
                  <span className="type-label-md text-on-secondary-container uppercase">{reading.unit}</span>
                )}
              </p>
              {reading.detail && <p className="mt-1 type-body-sm text-secondary-fixed">{reading.detail}</p>}
              {reading.qualifier && (
                <p className="mt-1 type-label-sm text-on-secondary-container uppercase">{reading.qualifier}</p>
              )}
            </div>
            {reading.scale != null && <ProgressBar value={reading.scale} />}
          </div>
        )}
      </CardBoundary>
    );
  }

  StatModule.displayName = `StatModule(${definition.id})`;
  return StatModule;
}
