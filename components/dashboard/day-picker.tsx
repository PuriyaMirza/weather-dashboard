import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import type { ForecastDayOption } from '@/lib/weather/forecast-day';
import { formatWeekday } from '@/lib/weather/units';

interface DayPickerProps {
  /** One per forecast day, as `listForecastDays` builds them — today first. */
  options: ForecastDayOption[];
  /** The chosen later day, or null for today. A date that isn't among the options reads as today. */
  selected: string | null;
  /** Called with the chosen day's date, or null when today is chosen. */
  onChange: (date: string | null) => void;
}

/**
 * 44px tall to clear the touch-target floor, and `shrink-0` so a week of chips scrolls sideways
 * rather than squeezing below legibility on a phone. The focus ring sits on the label because the
 * real input is visually hidden inside it.
 */
const CHIP =
  'relative flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-4 ' +
  'type-label-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary-fixed';

/**
 * Chooses which day the day-following modules describe: today's rolling next 24 hours, or any
 * later day of the forecast already loaded. Picking re-renders; it never re-fetches.
 *
 * Native radios in a fieldset rather than buttons with ARIA: one Tab stop for the whole group,
 * arrow keys to move between days, and the checked day announced, all from the browser for free.
 * The selection is shown by a tick as well as the fill, so it is never colour alone.
 *
 * Renders nothing with one day or fewer — there would be nothing to choose between.
 */
export function DayPicker({ options, selected, onChange }: DayPickerProps) {
  const name = useId();
  if (options.length <= 1) return null;

  const checkedDate = options.some((option) => !option.isToday && option.date === selected) ? selected : null;

  return (
    // min-w-0 because a fieldset's default minimum is its content's width, which would push a
    // week of chips straight out the side of a phone instead of letting the row scroll.
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="type-label-md text-on-surface">Plan for</legend>
      {/* Bleeds into the page gutter on purpose (same as the hour strip), so the row scrolls edge
          to edge on a phone instead of clipping chips at the padding. */}
      <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto scroll-px-5 px-5 pb-1 scrollbar-none">
        {options.map((option) => {
          const checked = option.isToday ? checkedDate === null : option.date === checkedDate;
          // "Sat" is what fits; "Saturday" is what a screen reader should say. The short form
          // stays inside the long one, so voice control still finds the chip by what it shows.
          const isWeekday = option.label === formatWeekday(option.date);

          return (
            <label
              key={option.date}
              className={`${CHIP} ${
                checked
                  ? 'bg-secondary-container text-secondary-fixed'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-primary'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.date}
                checked={checked}
                onChange={() => onChange(option.isToday ? null : option.date)}
                className="sr-only"
              />
              {checked && <Icon name="check" size={16} />}
              {isWeekday ? (
                <>
                  <span aria-hidden="true">{option.label}</span>
                  <span className="sr-only">{formatWeekday(option.date, 'long')}</span>
                </>
              ) : (
                option.label
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
