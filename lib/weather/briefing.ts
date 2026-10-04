import type { ForecastDayOption } from './forecast-day';
import type { DailyForecastDay, HourlyPoint, WeatherCondition, WeatherDashboardData } from './types';
import {
  formatHour,
  formatPercent,
  formatSpeed,
  formatTemperature,
  formatTemperatureDifference,
  formatWeekday,
  type UnitSystem,
} from './units';

/**
 * The day ahead in a few plain sentences — "Rain likely from about 3 PM until 6 PM." — built from
 * the forecast already on screen, with no request of its own.
 *
 * The other modules report readings and leave the reader to join them up. This joins them up, the
 * way a person glancing at the forecast would: when the rain comes, which way the temperature is
 * heading, whether the wind is worth mentioning, and how the day compares with the one before.
 *
 * The rule from `activity-windows.ts` holds here too: **never invent**. Each sentence stands on its
 * own inputs and is left out when they are missing, rather than filled with a guess. Four true
 * sentences beat five where one is made up, and an empty list is an honest answer the card reports
 * as unavailable.
 *
 * Pure: "now" is the first hour of the series (the normalizer starts it at the location's current
 * hour), never the viewer's clock, and every time is read in the location's own zone.
 */

/**
 * Thresholds, declared rather than computed so they can be read, argued with and tested. All in the
 * model's own imperial units — unit choice only changes how the answer is printed.
 *
 * Judgement calls, not science, kept in one place so they are cheap to change.
 */

/** An hour at or above this chance counts as "likely" — the same more-likely-than-not line the Rain Chance reading draws. */
export const LIKELY_PRECIPITATION_CHANCE = 50;

/** A peak chance below this reads as dry. Forecasters stop mentioning precipitation around here. */
export const DRY_PRECIPITATION_CHANCE = 20;

/** Between dry and likely, a peak below this is a "slight" chance and one at or above it just "a chance". */
export const SLIGHT_PRECIPITATION_CHANCE = 40;

/**
 * How far ahead today's temperature sentence looks. Long enough to see the afternoon from the
 * morning or the overnight low from the evening; short enough that it describes the hours someone
 * is about to live through, not tomorrow.
 */
export const TEMPERATURE_ARC_HOURS = 12;

/** A swing smaller than this over the arc isn't worth a sentence. */
export const NOTABLE_TEMPERATURE_CHANGE_F = 3;

/** Gusts at or above this are worth warning about — strong enough to push a bike or an umbrella around. */
export const GUSTY_GUST_MPH = 30;

/** Sustained wind at or above this is worth mentioning even without gusts. */
export const WINDY_SUSTAINED_MPH = 20;

/** Daily highs closer than this read as "similar temperatures" rather than warmer or cooler. */
export const SIMILAR_HIGH_F = 3;

/** From this local hour on, a stretch that runs to the end of a day is "into the night". */
const EVENING_HOUR = 20;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export interface BriefingOptions {
  unitSystem: UnitSystem;
  /**
   * The day picker's choice, with `data` already scoped to it (see `scopeToDay`). Null, absent or
   * today means the rolling next 24 hours.
   */
  forecastDay?: ForecastDayOption | null;
}

interface BriefingContext {
  hours: HourlyPoint[];
  isLaterDay: boolean;
  unitSystem: UnitSystem;
  timeZone: string;
}

function localDate(time: string): string {
  return time.slice(0, 10);
}

/** Read off the timestamp, which is the location's wall clock, so the viewer's zone can't shift it. */
function localHour(time: string): number {
  return Number(time.slice(11, 13));
}

function isNextHour(previous: HourlyPoint, next: HourlyPoint): boolean {
  return Date.parse(next.time) - Date.parse(previous.time) === MS_PER_HOUR;
}

/** Whole days from one YYYY-MM-DD to another, counted without any timezone (same as `forecast-day.ts`). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

/**
 * "3 PM", or "3 PM tomorrow" for an hour past midnight in today's rolling view — where a bare
 * "from about 3 PM" at four in the afternoon would read as an hour that has already gone. A later
 * day never needs it: all its hours are on the day the card is already labelled with.
 *
 * `since` is the time the sentence has already placed the reader at, so an end time only says
 * "tomorrow" when it crosses midnight from its own start: "from about 2 AM tomorrow until 6 AM",
 * not "until 6 AM tomorrow" twice.
 */
function at(time: string, context: BriefingContext, since: string = context.hours[0].time): string {
  const clock = formatHour(time, context.timeZone);
  const isTomorrow = !context.isLaterDay && localDate(time) !== localDate(since);
  return isTomorrow ? `${clock} tomorrow` : clock;
}

/** "the next 24 hours", or fewer when the series is short — it is never padded out to a full day. */
function nextHours(count: number): string {
  return count === 1 ? 'the next hour' : `the next ${count} hours`;
}

type PrecipitationKind = 'rain' | 'snow' | 'storms';

/**
 * What to call the precipitation, from the conditions the hours report. A storm anywhere wins,
 * because it changes plans that rain doesn't. Otherwise snow only when snow outnumbers rain, and
 * rain by default — a likely chance under a merely "cloudy" condition is still wet.
 */
function precipitationKind(conditions: WeatherCondition[]): PrecipitationKind {
  if (conditions.includes('storm')) return 'storms';
  const snow = conditions.filter((condition) => condition === 'snow').length;
  const rain = conditions.filter((condition) => condition === 'rain').length;
  return snow > rain ? 'snow' : 'rain';
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function maxBy<T>(items: T[], value: (item: T) => number): T {
  return items.reduce((best, item) => (value(item) > value(best) ? item : best));
}

function minBy<T>(items: T[], value: (item: T) => number): T {
  return items.reduce((best, item) => (value(item) < value(best) ? item : best));
}

/**
 * When the rain comes and goes. Only the first likely stretch is described: a briefing is a
 * glance, and the Precipitation module carries the full hour-by-hour picture.
 *
 * A stretch is consecutive hours at or above the likely line. A missing hour breaks it, as it does
 * an activity window — joining across the gap would vouch for an hour we know nothing about — and
 * then no end time is given at all rather than one guessed from the last hour we do know.
 */
function precipitationSentence(context: BriefingContext): string | null {
  const { hours, isLaterDay } = context;
  const peak = maxBy(hours, (hour) => hour.precipitationChance);

  if (peak.precipitationChance < DRY_PRECIPITATION_CHANCE) {
    return isLaterDay ? 'Dry all day.' : `Dry for ${nextHours(hours.length)}.`;
  }

  const startIndex = hours.findIndex((hour) => hour.precipitationChance >= LIKELY_PRECIPITATION_CHANCE);
  if (startIndex === -1) {
    const qualifier = peak.precipitationChance < SLIGHT_PRECIPITATION_CHANCE ? 'A slight chance' : 'A chance';
    return (
      `${qualifier} of ${precipitationKind([peak.condition])}, ` +
      `peaking at ${formatPercent(peak.precipitationChance)} around ${at(peak.time, context)}.`
    );
  }

  let endIndex = startIndex;
  while (
    endIndex + 1 < hours.length &&
    hours[endIndex + 1].precipitationChance >= LIKELY_PRECIPITATION_CHANCE &&
    isNextHour(hours[endIndex], hours[endIndex + 1])
  ) {
    endIndex += 1;
  }

  const start = hours[startIndex];
  const last = hours[endIndex];
  const after = hours[endIndex + 1];
  const kind = capitalize(precipitationKind(hours.slice(startIndex, endIndex + 1).map((hour) => hour.condition)));
  const reachesEnd = after === undefined;
  // The first hour back under the line is when it eases. Absent across a gap, where we can't say.
  const easesAt = after && isNextHour(last, after) ? at(after.time, context, start.time) : null;

  if (startIndex === 0 && !isLaterDay) {
    if (easesAt) return `${kind} now, easing around ${easesAt}.`;
    if (reachesEnd) return `${kind} now, and likely through ${nextHours(hours.length)}.`;
    return `${kind} now.`;
  }

  if (startIndex === 0 && isLaterDay) {
    if (reachesEnd) return `${kind} likely all day.`;
    if (easesAt) return `${kind} likely until about ${easesAt}.`;
  }

  const from = `${kind} likely from about ${at(start.time, context)}`;
  if (easesAt) return `${from} until ${easesAt}.`;
  if (reachesEnd) {
    // Said only where it's known: the stretch runs to the last hour we have, so its end is unknown
    // and only how far it reaches can be stated.
    if (localDate(last.time) !== localDate(start.time)) return `${from}, lasting into tomorrow.`;
    if (localHour(last.time) >= EVENING_HOUR) return `${from}, lasting into the night.`;
    return `${from} onward.`;
  }
  return `${from}.`;
}

/**
 * Today: which way the temperature is heading over the next several hours, measured from now. The
 * bigger of the rise and the fall wins, so a cold front that warms two degrees before dropping
 * fifteen is described by the drop. Left out when neither clears the threshold — "steady" is not
 * worth one of four sentences.
 *
 * A later day has no "now", so it gets that day's high, when it peaks, and its low instead.
 * A later day's hours start at midnight there, so no "tomorrow" is ever needed.
 */
function temperatureSentence(context: BriefingContext): string | null {
  const { hours, isLaterDay, unitSystem } = context;

  if (isLaterDay) {
    const high = maxBy(hours, (hour) => hour.temperatureF);
    const highText = formatTemperature(high.temperatureF, unitSystem);
    const lowText = formatTemperature(minBy(hours, (hour) => hour.temperatureF).temperatureF, unitSystem);
    // Compared as printed, so a swing that rounds away isn't given a "high" at an arbitrary hour.
    if (highText === lowText) return `Around ${highText} all day.`;
    return `High of ${highText} around ${at(high.time, context)}, low of ${lowText}.`;
  }

  const [first] = hours;
  const firstMs = Date.parse(first.time);
  const ahead = hours
    .slice(1)
    .filter((hour) => Date.parse(hour.time) - firstMs <= TEMPERATURE_ARC_HOURS * MS_PER_HOUR);
  if (ahead.length === 0) return null;

  const warmest = maxBy(ahead, (hour) => hour.temperatureF);
  const coolest = minBy(ahead, (hour) => hour.temperatureF);
  const rise = warmest.temperatureF - first.temperatureF;
  const fall = first.temperatureF - coolest.temperatureF;

  if (rise >= fall && rise >= NOTABLE_TEMPERATURE_CHANGE_F) {
    return `Warming to ${formatTemperature(warmest.temperatureF, unitSystem)} by ${at(warmest.time, context)}.`;
  }
  if (fall > rise && fall >= NOTABLE_TEMPERATURE_CHANGE_F) {
    return `Cooling to ${formatTemperature(coolest.temperatureF, unitSystem)} by ${at(coolest.time, context)}.`;
  }
  return null;
}

/**
 * Wind, only when it is worth a warning. Gusts are named when they cross their own line, since a
 * gust is what catches someone out; otherwise strong sustained wind is "windy". An hour whose wind
 * fields are both null can't trigger this, and a series with no wind data at all says nothing —
 * unknown wind is not calm wind, but it isn't a warning either.
 */
function windSentence(context: BriefingContext): string | null {
  const { hours, isLaterDay, unitSystem } = context;
  const isWindy = (hour: HourlyPoint) =>
    (hour.windGustMph != null && hour.windGustMph >= GUSTY_GUST_MPH) ||
    (hour.windMph != null && hour.windMph >= WINDY_SUSTAINED_MPH);

  const startIndex = hours.findIndex(isWindy);
  if (startIndex === -1) return null;

  const fromStart = hours.slice(startIndex);
  const gusts = fromStart.map((hour) => hour.windGustMph).filter((value): value is number => value != null);
  const isGusty = gusts.some((gust) => gust >= GUSTY_GUST_MPH);
  const speeds = isGusty
    ? gusts
    : fromStart.map((hour) => hour.windMph).filter((value): value is number => value != null);

  const when = startIndex === 0 && !isLaterDay ? 'now' : `from ${at(hours[startIndex].time, context)}`;
  return `${isGusty ? 'Gusty' : 'Windy'} ${when}, up to ${formatSpeed(Math.max(...speeds), unitSystem)}.`;
}

/** "8° warmer" / "8° cooler", or null when the highs are close enough to call similar. */
function describeHighChange(from: DailyForecastDay, to: DailyForecastDay, unitSystem: UnitSystem): string | null {
  const deltaF = to.highF - from.highF;
  if (Math.abs(deltaF) < SIMILAR_HIGH_F) return null;
  return `${formatTemperatureDifference(deltaF, unitSystem)} ${deltaF > 0 ? 'warmer' : 'cooler'}`;
}

/**
 * How the day compares with the one before it, by daily high.
 *
 * Today looks forward instead — "Tomorrow: 8° cooler, rain likely." — since what comes next is the
 * useful comparison from where someone is standing. Tomorrow has to actually be the next date: the
 * normalizer drops a day missing its high, low or condition, and a gap must not let Monday pass
 * itself off as tomorrow.
 *
 * A later day names the day it is compared with the way the day picker does — "today",
 * "tomorrow", then the weekday.
 */
function comparisonSentence(
  daily: DailyForecastDay[],
  forecastDay: ForecastDayOption | null | undefined,
  unitSystem: UnitSystem,
): string | null {
  const [today] = daily;
  if (!today) return null;

  if (!forecastDay || forecastDay.isToday) {
    const tomorrow = daily[1];
    if (!tomorrow || daysBetween(today.date, tomorrow.date) !== 1) return null;
    const change = describeHighChange(today, tomorrow, unitSystem) ?? 'similar temperatures';
    const wet =
      tomorrow.precipitationChance != null && tomorrow.precipitationChance >= LIKELY_PRECIPITATION_CHANCE
        ? `, ${precipitationKind([tomorrow.condition])} likely`
        : '';
    return `Tomorrow: ${change}${wet}.`;
  }

  const index = daily.findIndex((day) => day.date === forecastDay.date);
  if (index <= 0) return null;
  const previous = daily[index - 1];
  const offset = daysBetween(today.date, previous.date);
  const name = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : formatWeekday(previous.date, 'long');

  const change = describeHighChange(previous, daily[index], unitSystem);
  return change ? `${change} than ${name}.` : `Similar temperatures to ${name}.`;
}

/**
 * Up to four short sentences about the hours in `data.hourly` — the next 24 by default, or a later
 * day's when `data` has been scoped to it — in this order: precipitation, temperature, wind, and a
 * comparison with the neighbouring day. Any sentence whose inputs are missing is left out.
 *
 * No hours means no briefing at all, comparison included: the card would otherwise present a lone
 * "Tomorrow: 8° cooler." as a briefing on a day it knows nothing else about.
 */
export function buildBriefing(data: WeatherDashboardData, options: BriefingOptions): string[] {
  const hours = data.hourly ?? [];
  if (hours.length === 0) return [];

  const context: BriefingContext = {
    hours,
    isLaterDay: Boolean(options.forecastDay && !options.forecastDay.isToday),
    unitSystem: options.unitSystem,
    timeZone: data.location.timezone,
  };

  return [
    precipitationSentence(context),
    temperatureSentence(context),
    windSentence(context),
    comparisonSentence(data.daily ?? [], options.forecastDay, options.unitSystem),
  ].filter((sentence): sentence is string => sentence !== null);
}
