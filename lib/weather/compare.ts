import type { SelectedLocation } from './location';
import type { DailyForecastDay, WeatherDashboardData, WeatherLocation } from './types';
import { toShownTemperature, type UnitSystem } from './units';

/**
 * Domain logic for the Compare view: the dashboard's own location ("A") beside one remembered
 * second place ("B").
 *
 * Everything here is pure and reads only `WeatherDashboardData`, so the view is two ordinary
 * forecasts — fetched exactly as the dashboard fetches one — plus the arithmetic of setting them
 * side by side. Nothing in this module fetches, and nothing re-fetches on a unit switch.
 */

/**
 * How the two week-long forecasts are laid out: one row per calendar date with both places in it,
 * or each place's week in its own column.
 */
export type CompareLayout = 'by-day' | 'side-by-side';

export const COMPARE_LAYOUTS: readonly CompareLayout[] = ['by-day', 'side-by-side'];

/** By day puts the question people actually ask — "which is nicer on Saturday?" — in one row. */
export const DEFAULT_COMPARE_LAYOUT: CompareLayout = 'by-day';

/** Guards persisted state and share links, both of which may hold anything at all. */
export function isCompareLayout(value: unknown): value is CompareLayout {
  return typeof value === 'string' && (COMPARE_LAYOUTS as readonly string[]).includes(value);
}

/**
 * Whether two chosen locations are the same place, which makes comparing them meaningless.
 *
 * A matching id is enough on its own: geocoding ids name one place, and two geolocation fixes
 * (both `id: 'current'`) taken minutes apart differ in their last decimals while meaning "here".
 * Matching coordinates are enough too, because the forecast is keyed by coordinates — two entries
 * that share them would return the same forecast whatever they are called.
 */
export function isSamePlace(a: SelectedLocation, b: SelectedLocation): boolean {
  return a.id === b.id || (a.latitude === b.latitude && a.longitude === b.longitude);
}

/** One calendar date of the "By day" layout, with whichever place has no forecast for it null. */
export interface AlignedForecastDay {
  /** A local calendar date, YYYY-MM-DD, as `DailyForecastDay.date` carries it. */
  date: string;
  a: DailyForecastDay | null;
  b: DailyForecastDay | null;
}

/**
 * Pairs two daily forecasts by calendar date: the union of both lists' dates, ascending, with a
 * side left null on any date it has no forecast for.
 *
 * Rows are matched by date, never by index. Each forecast's days are that place's own local dates,
 * so two places far enough apart are on different calendar days at once — Tokyo is already on
 * tomorrow while Portland is still on today — and pairing by position would put two different
 * days in one row under one date. The normalizer can also drop a day it cannot fill, and a gap
 * in one list would shift every later pairing by one. A null side is shown as missing rather than
 * filled in, so nothing is invented for the day a place's forecast does not reach.
 *
 * Should a list ever repeat a date, its first entry is kept, so a row never silently swaps days.
 */
export function alignForecastDays(a: DailyForecastDay[], b: DailyForecastDay[]): AlignedForecastDay[] {
  const byDate = (days: DailyForecastDay[]) => {
    const map = new Map<string, DailyForecastDay>();
    for (const day of days) if (!map.has(day.date)) map.set(day.date, day);
    return map;
  };
  const aByDate = byDate(a);
  const bByDate = byDate(b);

  // YYYY-MM-DD sorts chronologically as a plain string, so no date parsing (or timezone) is needed.
  const dates = [...new Set([...aByDate.keys(), ...bByDate.keys()])].sort();

  return dates.map((date) => ({ date, a: aByDate.get(date) ?? null, b: bByDate.get(date) ?? null }));
}

/**
 * One temperature range spanning every day of every list — the lowest low to the highest high —
 * or null when there are no days at all.
 *
 * Range bars drawn against a shared scale can be compared at a glance; each forecast scaled to its
 * own week would draw a mild week and a hot one as the same full-width bar.
 */
export function sharedTemperatureScale(...lists: DailyForecastDay[][]): { min: number; max: number } | null {
  const days = lists.flat();
  if (days.length === 0) return null;
  return {
    min: Math.min(...days.map((day) => day.lowF)),
    max: Math.max(...days.map((day) => day.highF)),
  };
}

/**
 * Shown temperatures at most this many degrees apart read as "about the same" rather than warmer
 * or cooler.
 *
 * Judged on the two numbers as the cards print them (rounded, in the chosen unit) rather than on
 * the raw Fahrenheit readings: subtracting raw values and rounding afterwards could put "2° warmer"
 * beside cards reading 70° and 73°, and a sentence that disagrees with the numbers under it reads
 * as a bug. One degree apart on screen is within rounding noise, so it isn't called a difference.
 */
export const SIMILAR_SHOWN_DEGREES = 1;

/**
 * Names that tell the two places apart in a sentence: just the names when they differ, otherwise
 * each name qualified by the first of region, then country, that differs ("Portland, Maine" and
 * "Portland, Oregon"). Null when nothing does — a sentence comparing "Springfield" with
 * "Springfield" tells the reader nothing about which is which.
 */
function distinguishingNames(a: WeatherLocation, b: WeatherLocation): [string, string] | null {
  if (a.name !== b.name) return [a.name, b.name];
  for (const field of ['region', 'country'] as const) {
    if (a[field] !== b[field]) {
      const qualify = (location: WeatherLocation) =>
        location[field] ? `${location.name}, ${location[field]}` : location.name;
      return [qualify(a), qualify(b)];
    }
  }
  return null;
}

/**
 * One sentence on how B's temperature right now compares with A's: "Lisbon is 6° warmer than
 * Portland right now." B is the subject because A is the place the user lives on — the sentence
 * answers "what is it like over there?".
 *
 * Null when either place has no current reading (nothing is guessed from an hourly or daily
 * value), or when the two places cannot be told apart by name.
 */
export function describeCurrentDifference(
  a: WeatherDashboardData,
  b: WeatherDashboardData,
  unitSystem: UnitSystem,
): string | null {
  if (!a.current || !b.current) return null;

  const names = distinguishingNames(a.location, b.location);
  if (!names) return null;
  const [nameA, nameB] = names;

  const gap = toShownTemperature(b.current.temperatureF, unitSystem) - toShownTemperature(a.current.temperatureF, unitSystem);
  if (Math.abs(gap) <= SIMILAR_SHOWN_DEGREES) {
    return `${nameB} and ${nameA} are about the same temperature right now.`;
  }
  return `${nameB} is ${Math.abs(gap)}° ${gap > 0 ? 'warmer' : 'cooler'} than ${nameA} right now.`;
}
