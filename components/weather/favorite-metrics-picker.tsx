import { Icon } from '@/components/ui/icon';
import {
  FAVORITE_METRICS,
  MAX_FAVORITE_METRICS,
  type FavoriteMetricId,
} from '@/lib/weather/favorite-metrics';

interface FavoriteMetricsPickerProps {
  selected: FavoriteMetricId[];
  onToggle: (id: FavoriteMetricId) => void;
}

/**
 * Choose up to four readings to pin to the hero.
 *
 * Real checkboxes, so state is announced; once four are on, the rest are disabled — and the count
 * is said in words — rather than silently ignoring a click. The tick, not only the fill, carries
 * the checked state. The last remaining pick can't be turned off: an empty hero row has nothing to show.
 */
export function FavoriteMetricsPicker({ selected, onToggle }: FavoriteMetricsPickerProps) {
  const isFull = selected.length >= MAX_FAVORITE_METRICS;

  return (
    <div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FAVORITE_METRICS.map((metric) => {
          const isChecked = selected.includes(metric.id);
          const isDisabled = isChecked ? selected.length <= 1 : isFull;
          return (
            <li key={metric.id}>
              <label
                className={`flex min-h-12 items-center gap-3 rounded-xl bg-surface-container-high px-4 py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary-fixed ${
                  isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-surface-container-highest'
                }`}
              >
                <Icon name={metric.icon} size={20} className="shrink-0 text-secondary-fixed" />
                <span className="min-w-0 flex-1 type-label-lg text-on-surface">
                  {metric.title}
                </span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => onToggle(metric.id)}
                  className="peer sr-only"
                  // "Pin": the grid's module toggles carry the same names (Humidity, Wind speed…), and
                  // two checkboxes with one name are indistinguishable by ear. Still contains the
                  // visible label, as label-in-name requires.
                  aria-label={`Pin ${metric.title}`}
                />
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-on-surface-variant text-on-secondary peer-checked:border-secondary-fixed peer-checked:bg-secondary-fixed"
                >
                  {isChecked && <Icon name="check" size={16} />}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p role="status" className="mt-3 type-body-sm text-on-surface-variant">
        {selected.length} of {MAX_FAVORITE_METRICS} chosen
        {isFull ? ' — turn one off to pick another.' : '.'}
      </p>
    </div>
  );
}
