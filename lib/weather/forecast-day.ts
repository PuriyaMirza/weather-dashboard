import type { DailyForecastDay, SunMetrics, WeatherDashboardData } from './types';
import { formatWeekday } from './units';

/**
 * Lets the hourly-driven cards follow a chosen day of the week instead of only the next 24 hours.
 *
 * Everything here is derived from the one forecast already fetched — `forecastHours` and `daily`
 * cover the whole week — so picking a day re-renders and never re-fetches, the same contract unit
 * switching keeps.
 *
 * "Today" is `data.daily[0]`, not the viewer's clock: the daily series opens on the location's own
 * current date (it comes from the same request as `current`), which keeps these functions pure and
 * means a viewer in another timezone still gets the location's today.
 */

export interface ForecastDayOption {
  /** The location's local calendar date, YYYY-MM-DD, exactly as `data.daily` carries it. */
  date: string;
  label: string;
  isToday: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days from one YYYY-MM-DD to another. Both are read as UTC midnights purely as a
 * way to count days between two date strings — no timezone is involved in the answer.
 */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

/**
 * One option per day in the forecast, labelled "Today", "Tomorrow", then a short weekday ("Sat").
 *
 * Labels come from each day's distance to the first, not its position in the list: the normalizer
 * drops a day missing its high, low or condition, and a gap must not promote the day after it to
 * "Tomorrow".
 */
export function listForecastDays(data: WeatherDashboardData): ForecastDayOption[] {
  const today = data.daily[0]?.date;
  if (today === undefined) return [];

  return data.daily.map((day) => {
    const offset = daysBetween(today, day.date);
    return {
      date: day.date,
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : formatWeekday(day.date),
      isToday: offset === 0,
    };
  });
}

/**
 * The sun card's shape, rebuilt from one day's row.
 *
 * `uvIndexNow` is null because "now" only exists today. `daylightSeconds` is null because the daily
 * row doesn't carry the upstream figure, and reconstructing it from sunrise and sunset would present
 * a derived number as a reading. Every field null means there is nothing to show, same as the
 * normalizer's own rule for today's sun.
 */
function sunForDay(day: DailyForecastDay): SunMetrics | null {
  const sun: SunMetrics = {
    sunrise: day.sunrise,
    sunset: day.sunset,
    daylightSeconds: null,
    uvIndexMax: day.uvIndexMax,
    uvIndexNow: null,
  };
  const hasAnyValue = Object.values(sun).some((value) => value != null);
  return hasAnyValue ? sun : null;
}

/**
 * Narrows the model to one forecast day, for cards that follow the day picker.
 *
 * Today (or no selection) returns `data` itself, untouched and by reference: today's view is the
 * rolling next-24-hours window the cards already show, not "midnight to midnight", and keeping the
 * same object means selecting today costs nothing to re-render.
 *
 * Any other day swaps in that day's hours and sun. Hours are matched on the first ten characters
 * of their timestamp, which are the location's local date (the timestamps are offset-qualified
 * local wall-clock times), so the viewer's own timezone can't shift an hour onto the wrong day.
 * Everything else — current conditions, comfort, air quality — describes the present, and is left
 * as-is for the cards that never follow the picker.
 *
 * A date that isn't in the forecast returns `data` unchanged rather than an empty day, so a stale
 * selection (say, a week-old pick after the forecast rolled forward) degrades to today instead of
 * blanking every card.
 */
export function scopeToDay(data: WeatherDashboardData, date: string | null): WeatherDashboardData {
  if (date === null) return data;

  const index = data.daily.findIndex((day) => day.date === date);
  if (index <= 0) return data;

  // A response cached at the CDN from before `forecastHours` existed lacks it; that day then has
  // no hours to show, which the cards already render as unavailable.
  const forecastHours = data.forecastHours ?? [];

  return {
    ...data,
    hourly: forecastHours.filter((hour) => hour.time.slice(0, 10) === date),
    sun: sunForDay(data.daily[index]),
  };
}

/**
 * The full weekday name of a later day ("Saturday"), or null for today and for no selection.
 *
 * This is the one switch a day-following module needs: null keeps its default "next 24 hours"
 * copy, a name replaces it. Spelled out rather than the picker's own label because it lands in
 * prose ("Range 58° to 71° on Saturday"), and a weekday rather than "Tomorrow" so the module and
 * the daily forecast row for that day name it the same way.
 */
export function laterDayName(day: ForecastDayOption | null | undefined): string | null {
  if (!day || day.isToday) return null;
  return formatWeekday(day.date, 'long');
}
