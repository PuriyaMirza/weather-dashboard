import { scopeToDay } from './forecast-day';
import type { HourlyPoint, WeatherDashboardData } from './types';

/**
 * Finds the best stretch of hours to be outside, per activity.
 *
 * The dashboard is good at showing readings and poor at answering questions. This turns the hours
 * already fetched into a statement — "Cycle: 4-7 PM, wind under 10 mph" — without a single extra
 * upstream request: the next 24 hours by default, or any later day of the week via `scopeToDay`.
 *
 * Two rules matter more than any threshold below:
 *
 * 1. **Never invent a window.** If nothing clears the bar, this returns null and the module says
 *    so. Offering the least-bad hour of a downpour is the same class of error as inventing a
 *    missing reading, which this codebase already refuses to do (see `metrics.ts`, which returns
 *    null rather than a fabricated zero). "No good window" is a useful answer; a bad
 *    recommendation is worse than none.
 *
 * 2. **A window is a run of consecutive hours, not the single best hour.** "4-7 PM" is something
 *    you can act on. "5 PM" is trivia.
 */

export type ActivityId = 'walk' | 'run' | 'cycle' | 'garden';

/**
 * Thresholds an hour must clear. Declared rather than computed so they can be read, argued with
 * and tested — the same reason `metrics.ts` is a table instead of a switch.
 *
 * These numbers are judgement calls, not science. They are deliberately in one place so they are
 * cheap to change.
 */
export interface ActivityDefinition {
  id: ActivityId;
  label: string;
  /** Shown when there is no window, to explain what was being looked for. */
  description: string;
  maxPrecipitationChance: number;
  minFeelsLikeF: number;
  maxFeelsLikeF: number;
  maxWindMph: number;
  maxGustMph?: number;
  maxUvIndex?: number;
  /** Hours of unbroken suitable weather before this counts as a window at all. */
  minimumHours: number;
  /** True where the activity is impossible in the dark, rather than merely less pleasant. */
  requiresDaylight: boolean;
}

export const ACTIVITIES: ActivityDefinition[] = [
  {
    id: 'walk',
    label: 'Walk',
    description: 'Mild, dry, and not too windy.',
    maxPrecipitationChance: 40,
    minFeelsLikeF: 32,
    maxFeelsLikeF: 95,
    maxWindMph: 25,
    minimumHours: 1,
    requiresDaylight: false,
  },
  {
    id: 'run',
    label: 'Run',
    description: 'Cool enough to work hard, with the sun off its peak.',
    maxPrecipitationChance: 30,
    minFeelsLikeF: 25,
    maxFeelsLikeF: 80,
    maxWindMph: 20,
    maxUvIndex: 7,
    minimumHours: 1,
    requiresDaylight: false,
  },
  {
    id: 'cycle',
    label: 'Cycle',
    description: 'Calm air — wind matters more on a bike than temperature.',
    maxPrecipitationChance: 25,
    minFeelsLikeF: 35,
    maxFeelsLikeF: 90,
    maxWindMph: 15,
    maxGustMph: 25,
    minimumHours: 1,
    requiresDaylight: false,
  },
  {
    id: 'garden',
    label: 'Garden',
    description: 'Daylight, workable warmth, and a long enough stretch to finish something.',
    maxPrecipitationChance: 30,
    minFeelsLikeF: 45,
    maxFeelsLikeF: 90,
    maxWindMph: 20,
    maxUvIndex: 8,
    minimumHours: 2,
    requiresDaylight: true,
  },
];

export const ACTIVITY_IDS: ActivityId[] = ACTIVITIES.map((activity) => activity.id);

/**
 * Local hours of the day a window may cover, for every activity: from the hour starting 6 AM up
 * to, not including, 10 PM — so the last candidate is the hour starting 9 PM.
 *
 * A deliberate behaviour change rather than a weather threshold. The small hours are often the
 * calmest, driest stretch of the day, so without this bound the planner would happily answer
 * "Walk 12–5 AM": technically suitable weather, and useless advice. Unlike `requiresDaylight` this
 * is about when people are awake, not when it's light, so it applies to all activities alike.
 */
export const WAKING_HOURS = { start: 6, end: 22 } as const;

/** Guards persisted and link-supplied values, neither of which can be trusted to name a real activity. */
export function isActivityId(value: unknown): value is ActivityId {
  return typeof value === 'string' && (ACTIVITY_IDS as string[]).includes(value);
}

export interface ActivityWindow {
  activity: ActivityId;
  /** ISO timestamps, offset-qualified, matching the rest of the model. */
  start: string;
  /** End of the last suitable hour — exclusive, so a single 3pm hour ends at 4pm. */
  end: string;
  hours: number;
  /** Short phrases explaining why this window was chosen. Words, never colour. */
  reasons: string[];
  /**
   * The sunset timestamp, present when `start`–`end` itself straddles it — the window opens in
   * daylight and is still running when the sun goes down. Null whenever it doesn't, including when
   * the window has been trimmed to end at sunset (see `extendsUntil` for that case instead).
   */
  darkFrom: string | null;
  /**
   * Set only when a longer run of suitable weather continues past `end` into the dark: the window
   * itself is trimmed to the daylight portion (because that portion alone already meets the
   * activity's own minimum), and this carries the exclusive end of the fuller run, so the card can
   * still say the stretch after dark holds too, instead of silently dropping it.
   */
  extendsUntil: string | null;
}

export interface ActivityOutlook {
  definition: ActivityDefinition;
  /** Null when nothing in the forecast clears the bar — deliberately not a fallback. */
  window: ActivityWindow | null;
}

function offsetMinutes(offset: string): number {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * The moment an hour finishes: 3pm plus one hour, rendered in the location's own offset.
 *
 * Keeping the offset rather than letting `toISOString` convert to UTC matters — every other
 * timestamp in the model is offset-qualified, and `formatTime` reads it back in the location's
 * timezone. Shifting the epoch by the offset and then reading the UTC fields is what renders a
 * given instant in a given offset without pulling in a date library.
 */
function hourEnd(time: string): string {
  const offset = time.slice(-6);
  const shifted = new Date(new Date(time).getTime() + 60 * 60 * 1000 + offsetMinutes(offset) * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:00${offset}`
  );
}

/**
 * Whether one hour clears every threshold.
 *
 * A null optional reading fails the check it cannot answer, rather than passing by default. Wind
 * is the clearest case: "we don't know the wind" is not the same as "the wind is fine", and on a
 * bike that difference is the whole point.
 */
function isSuitable(hour: HourlyPoint, activity: ActivityDefinition): boolean {
  if (hour.precipitationChance > activity.maxPrecipitationChance) return false;
  if (hour.feelsLikeF < activity.minFeelsLikeF || hour.feelsLikeF > activity.maxFeelsLikeF) return false;

  if (hour.windMph == null || hour.windMph > activity.maxWindMph) return false;
  if (activity.maxGustMph != null && (hour.windGustMph == null || hour.windGustMph > activity.maxGustMph)) {
    return false;
  }
  if (activity.maxUvIndex != null && hour.uvIndex != null && hour.uvIndex > activity.maxUvIndex) return false;

  return true;
}

/**
 * The local hour of day, read straight off the timestamp.
 *
 * Timestamps are the location's wall clock with its offset appended, so characters 11–12 are the
 * hour as someone standing there reads it. Going through `Date` would answer in the viewer's zone.
 */
function localHourOfDay(hour: HourlyPoint): number {
  return Number(hour.time.slice(11, 13));
}

function isWakingHour(hour: HourlyPoint): boolean {
  const hourOfDay = localHourOfDay(hour);
  return hourOfDay >= WAKING_HOURS.start && hourOfDay < WAKING_HOURS.end;
}

function toEpochMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Which hours may be part of a window at all, before the weather is looked at.
 *
 * For daylight-required activities an hour counts as daylight when it *starts* in daylight: at or
 * after sunrise, before sunset. The opening hour is the one someone acts on, so it has to be light
 * already. Each bound applies only when known — a missing sunrise or sunset must not silently make
 * daylight activities impossible.
 */
function candidateFilter(data: WeatherDashboardData, activity: ActivityDefinition): (hour: HourlyPoint) => boolean {
  const sunriseMs = activity.requiresDaylight ? toEpochMs(data.sun?.sunrise) : null;
  const sunsetMs = activity.requiresDaylight ? toEpochMs(data.sun?.sunset) : null;

  return (hour) => {
    if (!isWakingHour(hour)) return false;
    const startMs = Date.parse(hour.time);
    if (sunriseMs != null && startMs < sunriseMs) return false;
    if (sunsetMs != null && startMs >= sunsetMs) return false;
    return true;
  };
}

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Longest run wins; ties go to the earlier one, because sooner is more useful than later.
 *
 * An excluded hour breaks a run exactly as bad weather does, rather than being filtered out first:
 * filtering would make 9 PM and the next morning's 6 AM neighbours in the list, and report one
 * "window" spanning a night nobody was told about. For the same reason a run also breaks wherever
 * an hour is missing from the series (the normalizer drops incomplete hours) — joining across that
 * gap would vouch for an hour we know nothing about.
 */
function longestRun(
  hours: HourlyPoint[],
  activity: ActivityDefinition,
  isCandidate: (hour: HourlyPoint) => boolean,
): HourlyPoint[] | null {
  let best: HourlyPoint[] = [];
  let current: HourlyPoint[] = [];

  for (const hour of hours) {
    if (!isCandidate(hour) || !isSuitable(hour, activity)) {
      current = [];
      continue;
    }

    const previous = current[current.length - 1];
    if (previous && Date.parse(hour.time) - Date.parse(previous.time) !== MS_PER_HOUR) current = [];

    current.push(hour);
    if (current.length > best.length) best = [...current];
  }

  return best.length >= activity.minimumHours ? best : null;
}

function describe(run: HourlyPoint[], activity: ActivityDefinition): string[] {
  const reasons: string[] = [];

  const peakRain = Math.max(...run.map((hour) => hour.precipitationChance));
  reasons.push(peakRain === 0 ? 'No rain expected' : `Rain chance under ${Math.ceil(peakRain / 5) * 5}%`);

  const low = Math.round(Math.min(...run.map((hour) => hour.feelsLikeF)));
  const high = Math.round(Math.max(...run.map((hour) => hour.feelsLikeF)));
  reasons.push(low === high ? `Feels like ${low}°` : `Feels like ${low}–${high}°`);

  const winds = run.map((hour) => hour.windMph).filter((value): value is number => value != null);
  if (winds.length > 0) reasons.push(`Wind under ${Math.ceil(Math.max(...winds))} mph`);

  // Only worth saying for activities that actually care about sun exposure.
  if (activity.maxUvIndex != null) {
    const uv = run.map((hour) => hour.uvIndex).filter((value): value is number => value != null);
    if (uv.length > 0) reasons.push(`UV up to ${Math.round(Math.max(...uv))}`);
  }

  return reasons;
}

function finalizeWindow(
  run: HourlyPoint[],
  activity: ActivityDefinition,
  darkFrom: string | null,
  extendsUntil: string | null,
): ActivityWindow {
  const last = run[run.length - 1];
  return {
    activity: activity.id,
    start: run[0].time,
    end: hourEnd(last.time),
    hours: run.length,
    reasons: describe(run, activity),
    darkFrom,
    extendsUntil,
  };
}

/**
 * Turns a run of suitable hours into the window actually reported.
 *
 * A run entirely on one side of sunset is reported as-is. A run that straddles it is trimmed to
 * the daylight portion when that portion alone already meets the activity's own minimum — "until
 * 8 PM, and also fine after dark" is more actionable than one span silently covering both, and
 * `extendsUntil` still carries the fuller run so nothing is dropped, just separated. When the
 * daylight portion alone isn't enough to stand on its own, the whole straddling run is reported,
 * same as before this split existed.
 *
 * Daylight-required activities never reach a straddling run here, since `candidateFilter`
 * already bounds their candidate hours to between sunrise and sunset.
 */
function buildWindow(run: HourlyPoint[], activity: ActivityDefinition, sunsetIso: string | null): ActivityWindow {
  const sunsetMs = sunsetIso ? Date.parse(sunsetIso) : NaN;
  if (sunsetIso == null || Number.isNaN(sunsetMs)) return finalizeWindow(run, activity, null, null);

  const daylightPortion = run.filter((hour) => new Date(hour.time).getTime() < sunsetMs);

  if (daylightPortion.length === run.length) return finalizeWindow(run, activity, null, null);
  if (daylightPortion.length === 0) return finalizeWindow(run, activity, sunsetIso, null);

  if (daylightPortion.length >= activity.minimumHours) {
    return finalizeWindow(daylightPortion, activity, null, hourEnd(run[run.length - 1].time));
  }

  return finalizeWindow(run, activity, sunsetIso, null);
}

/**
 * The best window for one activity within `data.hourly`, or null when nothing clears the bar.
 *
 * `data.sun` supplies the sunrise and sunset that bound activities needing light, and the sunset
 * that splits a run at dark. Reading them as plain timestamps off the model keeps this pure and
 * trivially testable — no clock, no timezone library, no I/O — and lets a day scoped by
 * `scopeToDay` bring its own sun times with it.
 */
function windowFor(data: WeatherDashboardData, definition: ActivityDefinition): ActivityWindow | null {
  const run = longestRun(data.hourly ?? [], definition, candidateFilter(data, definition));
  return run === null ? null : buildWindow(run, definition, data.sun?.sunset ?? null);
}

/**
 * Builds the outlook for every activity.
 *
 * `selected` narrows the report to the activities someone actually cares about. An empty or absent
 * list means *unspecified* rather than *none* — anyone who has never stated a preference, which
 * includes every dashboard saved before this existed, still sees all four.
 */
export function findActivityWindows(data: WeatherDashboardData, selected?: ActivityId[]): ActivityOutlook[] {
  const reported =
    selected && selected.length > 0 ? ACTIVITIES.filter((activity) => selected.includes(activity.id)) : ACTIVITIES;

  return reported.map((definition) => ({ definition, window: windowFor(data, definition) }));
}

/**
 * The first day after today with a window for this activity, for answering "not today — when?".
 *
 * Each day is scoped with `scopeToDay`, so it is judged on its own hours against its own sunrise
 * and sunset rather than today's. Null when no later day in the forecast has one — the same refusal
 * to offer a least-bad option that `findActivityWindows` keeps for today.
 */
export function findNextWindow(
  data: WeatherDashboardData,
  activityId: ActivityId,
): { date: string; window: ActivityWindow } | null {
  const definition = ACTIVITIES.find((activity) => activity.id === activityId);
  if (!definition) return null;

  for (const day of data.daily.slice(1)) {
    const window = windowFor(scopeToDay(data, day.date), definition);
    if (window) return { date: day.date, window };
  }

  return null;
}
