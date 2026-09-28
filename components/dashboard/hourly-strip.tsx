import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { conditionShortLabel, inferIsDay } from '@/lib/weather/atmosphere';
import { conditionIcon } from '@/lib/weather/condition-icon';
import type { HourlyPoint, WeatherDashboardData } from '@/lib/weather/types';
import { formatHour, formatTemperature, type UnitSystem } from '@/lib/weather/units';

/** Hours shown. Enough to plan the rest of a day without turning into a chart. */
export const STRIP_HOURS = 12;

const HOUR_MS = 60 * 60 * 1000;

interface HourlyStripProps {
  data: WeatherDashboardData;
  unitSystem: UnitSystem;
  /** True when a wrapping card already renders its own "Next Hours" heading (see
   *  next-hours-card.tsx) — skips this component's own heading so the two don't repeat, while
   *  keeping the rain-range summary and the full pill list exactly the same. */
  embedded?: boolean;
}

/**
 * Whether an hour is day or night, judged against *that day's* sunrise and sunset — the strip
 * crosses midnight, and tomorrow's 6 AM measured against today's sunset would read as night.
 */
function isHourDaytime(hour: HourlyPoint, data: WeatherDashboardData): boolean {
  // Tolerates a malformed daily row: the strip sits outside any module boundary, so a bad entry
  // here would take down the whole page rather than just the Daily Forecast tile.
  const day = data.daily.find((entry) => entry?.date === hour.time.slice(0, 10));
  return inferIsDay(hour.time, day?.sunrise ?? null, day?.sunset ?? null);
}

/** True when the reading on screen was observed inside this hour. */
function containsObservation(hour: HourlyPoint, observedAt: string | undefined): boolean {
  if (!observedAt) return false;
  const start = Date.parse(hour.time);
  const observed = Date.parse(observedAt);
  if (Number.isNaN(start) || Number.isNaN(observed)) return false;
  return observed >= start && observed < start + HOUR_MS;
}

/** "RAIN 10–40%" across the hours shown, or null when there are none. */
export function rainRangeLabel(hours: HourlyPoint[]): string | null {
  if (hours.length === 0) return null;
  const chances = hours.map((hour) => Math.round(hour.precipitationChance));
  const low = Math.min(...chances);
  const high = Math.max(...chances);
  return low === high ? `Rain ${low}%` : `Rain ${low}–${high}%`;
}

/**
 * The next hours as a row of pills. The hour containing the current observation is marked "Now"
 * and shows the observed reading, so it can't disagree with the temperature printed just above it.
 *
 * It scrolls horizontally rather than shrinking below legibility, so the list is focusable — the
 * hours past the right edge would otherwise be unreachable without a pointer.
 */
export function HourlyStrip({ data, unitSystem, embedded = false }: HourlyStripProps) {
  const headingId = useId();
  const hours = data.hourly.slice(0, STRIP_HOURS);
  if (hours.length === 0) return null;

  const timeZone = data.location.timezone;
  const current = data.current;
  const rainRange = rainRangeLabel(hours);

  return (
    <div className="flex flex-col gap-2">
      {embedded
        ? rainRange && <p className="type-label-sm uppercase text-secondary-fixed">{rainRange}</p>
        : <SectionHeader id={headingId} title="Next Hours" meta={rainRange} />}
      <ul
        tabIndex={0}
        aria-labelledby={embedded ? undefined : headingId}
        aria-label={embedded ? 'Next Hours' : undefined}
        className="-mx-5 flex gap-2 overflow-x-auto scroll-px-5 px-5 pb-1.5 scrollbar-none outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed focus-visible:ring-inset"
      >
        {hours.map((hour) => {
          const isNow = current != null && containsObservation(hour, current.observedAt);
          const isDay = isNow && current.isDay != null ? current.isDay : isHourDaytime(hour, data);
          const condition = isNow ? current.condition : hour.condition;
          const temperatureF = isNow ? current.temperatureF : hour.temperatureF;

          // `relative` anchors the sr-only text: absolutely positioned, it would otherwise escape the
          // scroller's clipping and widen the whole page.
          return (
            <li
              key={hour.time}
              className={`relative flex min-w-[70px] shrink-0 flex-col items-center rounded-xl px-2 py-3 ${
                isNow ? 'bg-secondary-container shadow-raised' : 'bg-surface-container-high'
              }`}
            >
              {isNow ? (
                <>
                  <span className="type-label-sm font-bold uppercase text-secondary-fixed">Now</span>
                  {/* The clock hour is still stated for screen readers — "Now" alone doesn't say when. */}
                  <span className="sr-only">{formatHour(hour.time, timeZone)}</span>
                </>
              ) : (
                <span className="type-label-sm whitespace-nowrap text-on-secondary-container">
                  {formatHour(hour.time, timeZone)}
                </span>
              )}
              <Icon
                name={conditionIcon(condition, isDay)}
                size={24}
                className={`my-1.5 ${isNow ? 'text-secondary-fixed' : 'text-secondary'}`}
              />
              <span className="type-label-lg font-bold text-primary tabular-nums">
                {formatTemperature(temperatureF, unitSystem)}
              </span>
              <span className={`mt-1 type-label-sm ${isNow ? 'text-secondary-fixed' : 'text-on-secondary-container'}`}>
                {conditionShortLabel(condition, isDay)}
              </span>
              <span className="sr-only">, {Math.round(hour.precipitationChance)}% chance of rain</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
