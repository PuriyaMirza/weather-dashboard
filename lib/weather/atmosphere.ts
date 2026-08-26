import type { CSSProperties } from 'react';
import type { WeatherCondition } from './types';

/**
 * Maps the weather onto the sky behind the hero.
 *
 * This is separate from light/dark mode, which follows the system setting. This is atmosphere:
 * a clear afternoon and a midnight storm should not look identical. It is decorative — every
 * value it depicts is also stated in words elsewhere, so nothing is conveyed by colour alone.
 */
export interface AtmospherePalette {
  /** Gradient stops, consumed by the `.atmosphere` class in globals.css. */
  from: string;
  via: string;
  to: string;
  /** Text colours that stay legible against the gradient above. */
  ink: string;
  inkMuted: string;
  /** Short description of the sky, used as the hero's accessible backdrop label. */
  label: string;
}

type ConditionPalettes = Record<WeatherCondition, AtmospherePalette>;

const DAY: ConditionPalettes = {
  sunny: { from: '#bae6fd', via: '#dbeafe', to: '#eff6ff', ink: '#0c2438', inkMuted: '#2f4a63', label: 'Clear daytime sky' },
  'partly-cloudy': { from: '#cfe4f7', via: '#e2edf7', to: '#f1f5f9', ink: '#0f2333', inkMuted: '#3a5060', label: 'Partly cloudy sky' },
  cloudy: { from: '#d7dee6', via: '#e3e8ee', to: '#f1f5f9', ink: '#182430', inkMuted: '#43505c', label: 'Overcast sky' },
  rain: { from: '#b9c9d8', via: '#cdd9e4', to: '#e6ecf2', ink: '#12212e', inkMuted: '#3b4d5c', label: 'Rainy sky' },
  snow: { from: '#dce7f2', via: '#eaf1f8', to: '#f7fafd', ink: '#16232f', inkMuted: '#41525f', label: 'Snowy sky' },
  storm: { from: '#9aa8bb', via: '#b6c1ce', to: '#d8dee6', ink: '#101823', inkMuted: '#2b333e', label: 'Stormy sky' },
  fog: { from: '#d5d9dd', via: '#e4e7ea', to: '#f2f4f6', ink: '#1b2128', inkMuted: '#454d55', label: 'Foggy sky' },
};

const NIGHT: ConditionPalettes = {
  sunny: { from: '#132a4a', via: '#0d1c33', to: '#070d18', ink: '#eaf2fb', inkMuted: '#a9bdd4', label: 'Clear night sky' },
  'partly-cloudy': { from: '#182a41', via: '#111d2e', to: '#080d15', ink: '#e9eff7', inkMuted: '#a6b7cb', label: 'Partly cloudy night sky' },
  cloudy: { from: '#1d2733', via: '#141b24', to: '#090c11', ink: '#e8ecf1', inkMuted: '#a5b0bd', label: 'Overcast night sky' },
  rain: { from: '#152532', via: '#0e1a24', to: '#070b10', ink: '#e6eef4', inkMuted: '#9fb4c4', label: 'Rainy night sky' },
  snow: { from: '#1d2a3a', via: '#141d29', to: '#090d13', ink: '#edf3f9', inkMuted: '#aebccd', label: 'Snowy night sky' },
  storm: { from: '#1a1f2e', via: '#111420', to: '#07090f', ink: '#e8eaf2', inkMuted: '#a4abbd', label: 'Stormy night sky' },
  fog: { from: '#20262d', via: '#171b21', to: '#0b0d10', ink: '#e9ecef', inkMuted: '#a8b0b8', label: 'Foggy night sky' },
};

/** Used before any weather has loaded, and whenever the condition is unknown. */
export const NEUTRAL_ATMOSPHERE: AtmospherePalette = {
  from: '#dbeafe',
  via: '#e0f2fe',
  to: '#f1f5f9',
  ink: '#0f172a',
  inkMuted: '#334155',
  label: 'Daytime sky',
};

export function getAtmosphere(condition: WeatherCondition | null | undefined, isDay: boolean): AtmospherePalette {
  if (!condition) return NEUTRAL_ATMOSPHERE;
  return (isDay ? DAY : NIGHT)[condition] ?? NEUTRAL_ATMOSPHERE;
}

/**
 * The palette as inline custom properties. Returned as a style object rather than a class so the
 * gradient can vary continuously with the data without generating a class per condition.
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
