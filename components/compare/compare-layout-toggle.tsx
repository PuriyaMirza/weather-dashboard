import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import { COMPARE_LAYOUTS, type CompareLayout } from '@/lib/weather/compare';

const LABELS: Record<CompareLayout, string> = {
  'by-day': 'By day',
  'side-by-side': 'Side by side',
};

/** Same 44px chip as the day picker; the focus ring sits on the label around the hidden radio. */
const CHIP =
  'relative flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-4 ' +
  'type-label-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary-fixed';

interface CompareLayoutToggleProps {
  value: CompareLayout;
  onChange: (layout: CompareLayout) => void;
}

/**
 * Switches the week between one row per date and each place's week in its own column.
 *
 * Native radios in a fieldset, like the day picker: one Tab stop, arrow keys between the options,
 * and the checked one announced, all from the browser. The choice is marked by a tick as well as
 * the fill, so it is never colour alone.
 */
export function CompareLayoutToggle({ value, onChange }: CompareLayoutToggleProps) {
  const name = useId();

  return (
    <fieldset className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-0 p-0">
      <legend className="float-left type-headline-sm text-primary">7-day forecast</legend>
      <div className="flex flex-wrap gap-2">
        {COMPARE_LAYOUTS.map((layout) => {
          const checked = layout === value;
          return (
            <label
              key={layout}
              className={`${CHIP} ${
                checked
                  ? 'bg-secondary-container text-secondary-fixed'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-primary'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={layout}
                checked={checked}
                onChange={() => onChange(layout)}
                className="sr-only"
              />
              {checked && <Icon name="check" size={16} />}
              {LABELS[layout]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
