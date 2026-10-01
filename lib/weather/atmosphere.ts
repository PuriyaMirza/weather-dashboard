import type { CSSProperties } from 'react';
import type { WeatherCondition, WeatherDashboardData } from './types';

/**
 * Maps the weather onto the sky above the hero's tree line.
 *
 * This is atmosphere, not theming: a clear afternoon and a midnight storm should not look
 * identical. It is decorative — the condition and time of day are always stated in words in the
 * hero's heading — so nothing is conveyed by colour alone.
 *
 * Every palette stays inside the Forest family (deep greens), because a literal blue sky reads as a
 * stray photograph on an evergreen page. Condition and time of day come through as *weight*: clear
 * days are the most open, storms and nights close in — a shift that survives greyscale and poor
 * displays, where a hue change would not.
 */
export interface AtmospherePalette {
  /** Top of the sky. Only the band above the hero text — free to be the lightest stop. */
  from: string;
  /** The sky where the hero text begins (see `HERO_TEXT_TOP`). */
  via: string;
  /** The horizon, behind the fog banks and tree line. */
  to: string;
  /** Heading colour on this sky. */
  ink: string;
  /** Body colour on this sky. */
  inkMuted: string;
  /** Short description of the sky, for tests and any future text alternative. */
  label: string;
}

type ConditionPalettes = Record<WeatherCondition, AtmospherePalette>;

/*
  The hero's text colours are Forest's --primary and --on-surface-variant. They are repeated here as
  literals, not read from CSS, so the contrast test can check the pairs the hero actually paints.
*/
const INK = '#ffffff';
const INK_MUTED = '#c2c8c4';

function palette(from: string, via: string, to: string, label: string): AtmospherePalette {
  return { from, via, to, ink: INK, inkMuted: INK_MUTED, label };
}

const DAY: ConditionPalettes = {
  sunny: palette('#46786a', '#2a5346', '#183a30', 'Clear daytime sky'),
  'partly-cloudy': palette('#3e6c5e', '#264c40', '#16362d', 'Partly cloudy sky'),
  cloudy: palette('#355a50', '#22433a', '#14312a', 'Overcast sky'),
  rain: palette('#2c4c44', '#1c3a33', '#112a24', 'Rainy sky'),
  snow: palette('#4a6a62', '#2c4b44', '#1a3730', 'Snowy sky'),
  storm: palette('#22393a', '#15292a', '#0c1c1b', 'Stormy sky'),
  fog: palette('#445d57', '#2b433d', '#1a312b', 'Foggy sky'),
};

const NIGHT: ConditionPalettes = {
  sunny: palette('#12302e', '#0a1f1e', '#051413', 'Clear night sky'),
  'partly-cloudy': palette('#112b28', '#0a1d1a', '#051311', 'Partly cloudy night sky'),
  cloudy: palette('#102622', '#0a1a17', '#041210', 'Overcast night sky'),
  rain: palette('#0e221f', '#081815', '#03100e', 'Rainy night sky'),
  snow: palette('#16302c', '#0d201d', '#061513', 'Snowy night sky'),
  storm: palette('#0b1b1a', '#061312', '#020b0a', 'Stormy night sky'),
  fog: palette('#152a26', '#0c1c19', '#051210', 'Foggy night sky'),
};

/** Used before any weather has loaded, and whenever the condition is unknown. */
export const NEUTRAL_ATMOSPHERE: AtmospherePalette = palette('#142f28', '#0e2720', '#08241d', 'Forest sky');

export function getAtmosphere(condition: WeatherCondition | null | undefined, isDay: boolean): AtmospherePalette {
  if (!condition) return NEUTRAL_ATMOSPHERE;
  return (isDay ? DAY : NIGHT)[condition] ?? NEUTRAL_ATMOSPHERE;
}

/**
 * The fixed layers of the hero art that can sit behind its text. Shared with the illustration so
 * the contrast test measures what is actually drawn rather than a copy that could drift.
 */
export const HERO_ART = {
  /** Mid-elevation fog banks, back to front. */
  fogBands: [
    { color: '#243e37', opacity: 0.6 },
    { color: '#2d5043', opacity: 0.8 },
  ],
  /** The pale low-fog glow drifting across the tree line. */
  fogGlow: { color: '#c4ebda', opacity: 0.12 },
  /**
   * The mist overlay (--surface-container-high) at its thinnest anywhere behind text. It is opaque
   * at the bottom of the art and 40% at mid-height, fading out towards the top.
   */
  mist: { color: '#142f28', minOpacityBehindText: 0.35 },
} as const;

/**
 * Fraction of the art's height above which hero text never sits — the chip, heading and body are
 * bottom-anchored and even a three-line body at 320px stays below it. The sky's `via` stop sits
 * here, so text only ever overlaps the `via`→`to` part of the gradient.
 */
export const HERO_TEXT_TOP = 0.3;

/**
 * The palette as inline custom properties, consumed by the `text-sky-ink` utilities. A style
 * object rather than a class so the tones can vary with the data without a class per condition.
 */
export function atmosphereStyle(palette: AtmospherePalette): CSSProperties {
  return {
    '--sky-from': palette.from,
    '--sky-via': palette.via,
    '--sky-to': palette.to,
    '--sky-ink': palette.ink,
    '--sky-ink-muted': palette.inkMuted,
  } as CSSProperties;
}

/**
 * Falls back to comparing the observation time against sunrise/sunset when the provider did not
 * report `is_day` — for instance in older cached payloads or the mock fixture.
 */
export function inferIsDay(observedAt: string, sunrise: string | null, sunset: string | null): boolean {
  if (!sunrise || !sunset) return true;

  const observed = Date.parse(observedAt);
  const rise = Date.parse(sunrise);
  const set = Date.parse(sunset);
  if (Number.isNaN(observed) || Number.isNaN(rise) || Number.isNaN(set)) return true;

  return observed >= rise && observed < set;
}

/**
 * Whether the current reading is by day: the provider's own flag when it sent one, otherwise
 * inferred from sunrise and sunset. Shared so the hero's art and the Right Now card never disagree.
 */
export function currentIsDay(data: WeatherDashboardData): boolean {
  const current = data.current;
  if (!current) return true;
  return current.isDay ?? inferIsDay(current.observedAt, data.sun?.sunrise ?? null, data.sun?.sunset ?? null);
}

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Day';

/** Hour of the day (0–23) at the location, or null when the timestamp or zone can't be read. */
function localHour(isoTimestamp: string, timeZone?: string): number | null {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;
  const format = (zone?: string) =>
    Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: zone }).format(date));
  try {
    return format(timeZone);
  } catch {
    return format();
  }
}

/**
 * The part of the day at the location. Daylight decides day versus night (so a 6 PM sunset in
 * December reads as evening, not afternoon); the clock only splits each half. Without a readable
 * time it says just "Day" or "Night" rather than guessing.
 */
export function timeOfDay(observedAt: string, isDay: boolean, timeZone?: string): TimeOfDay {
  const hour = localHour(observedAt, timeZone);
  if (hour === null) return isDay ? 'Day' : 'Night';
  if (isDay) {
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }
  return hour >= 17 && hour < 22 ? 'Evening' : 'Night';
}

const HEADLINE_WORD: Record<WeatherCondition, [day: string, night: string]> = {
  sunny: ['Sunny', 'Clear'],
  'partly-cloudy': ['Partly Cloudy', 'Partly Cloudy'],
  cloudy: ['Overcast', 'Overcast'],
  rain: ['Rainy', 'Rainy'],
  snow: ['Snowy', 'Snowy'],
  storm: ['Stormy', 'Stormy'],
  fog: ['Foggy', 'Foggy'],
};

/** The hero's heading, e.g. "Partly Cloudy Afternoon" or "Clear Night". */
export function skyHeadline(
  condition: WeatherCondition,
  isDay: boolean,
  observedAt: string,
  timeZone?: string,
): string {
  const word = HEADLINE_WORD[condition][isDay ? 0 : 1];
  return `${word} ${timeOfDay(observedAt, isDay, timeZone)}`;
}

const SHORT_WORD: Record<WeatherCondition, [day: string, night: string]> = {
  sunny: ['Sunny', 'Clear'],
  'partly-cloudy': ['Clouds', 'Clouds'],
  cloudy: ['Overcast', 'Overcast'],
  rain: ['Rain', 'Rain'],
  snow: ['Snow', 'Snow'],
  storm: ['Storm', 'Storm'],
  fog: ['Fog', 'Fog'],
};

/** One word for a condition, short enough for a 70px hour pill. */
export function conditionShortLabel(condition: WeatherCondition, isDay = true): string {
  return SHORT_WORD[condition][isDay ? 0 : 1];
}
