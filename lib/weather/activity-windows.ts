import type { HourlyPoint, WeatherDashboardData } from './types';

/**
 * Finds the best stretch of hours to be outside, per activity.
 *
 * The dashboard is good at showing readings and poor at answering questions. This turns the 24
 * hours already fetched into a statement — "Cycle: 4-7 PM, wind under 10 mph" — without a single
 * extra upstream request.
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
  /** True when any part of the window falls after sunset. Stated rather than hidden. */
  afterDark: boolean;
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

/** Longest run wins; ties go to the earlier one, because sooner is more useful than later. */
function longestRun(hours: HourlyPoint[], activity: ActivityDefinition): HourlyPoint[] | null {
  let best: HourlyPoint[] = [];
  let current: HourlyPoint[] = [];

  for (const hour of hours) {
    if (isSuitable(hour, activity)) {
      current.push(hour);
      if (current.length > best.length) best = [...current];
    } else {
      current = [];
    }
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

/**
 * Builds the outlook for every activity.
 *
 * `sunset` bounds the search for activities that need light. Passing it as a plain timestamp keeps
 * this function pure and trivially testable — no clock, no timezone library, no I/O.
 *
 * `selected` narrows the report to the activities someone actually cares about. An empty or absent
 * list means *unspecified* rather than *none* — anyone who has never stated a preference, which
 * includes every dashboard saved before this existed, still sees all four.
 */
export function findActivityWindows(data: WeatherDashboardData, selected?: ActivityId[]): ActivityOutlook[] {
  const hourly = data.hourly ?? [];
  const sunsetMs = data.sun?.sunset ? new Date(data.sun.sunset).getTime() : null;

  const reported =
    selected && selected.length > 0 ? ACTIVITIES.filter((activity) => selected.includes(activity.id)) : ACTIVITIES;

  return reported.map((definition) => {
    const candidates =
      definition.requiresDaylight && sunsetMs != null
        ? hourly.filter((hour) => new Date(hour.time).getTime() < sunsetMs)
        : hourly;

    const run = longestRun(candidates, definition);
    if (run === null) return { definition, window: null };

    const last = run[run.length - 1];
    const afterDark =
      sunsetMs != null && new Date(last.time).getTime() >= sunsetMs;

    return {
      definition,
      window: {
        activity: definition.id,
        start: run[0].time,
        end: hourEnd(last.time),
        hours: run.length,
        reasons: describe(run, definition),
        afterDark,
      },
    };
  });
}
