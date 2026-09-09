import type { CSSProperties } from 'react';
import type { WeatherCondition } from './types';

/**
 * Maps the weather onto the sky behind the hero.
 *
 * This is separate from light/dark mode, which follows the system setting. This is atmosphere:
 * a clear afternoon and a midnight storm should not look identical. It is decorative — every
 * value it depicts is also stated in words elsewhere, so nothing is conveyed by colour alone.
 *
 * The palettes are warm greys rather than blues: on a monochrome page a literal blue sky reads as
 * a stray photograph. Condition and time of day come through as *weight* — clear is light and
 * open, storm is dense and close — which survives greyscale printing and low-quality displays,
 * where a hue shift would not.
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
  sunny: { from: '#f7f5ef', via: '#f4f3f0', to: '#e9e6dd', ink: '#16150f', inkMuted: '#4a4840', label: 'Clear daytime sky' },
  'partly-cloudy': { from: '#efede7', via: '#eae8e2', to: '#dedbd2', ink: '#16150f', inkMuted: '#4a4840', label: 'Partly cloudy sky' },
  cloudy: { from: '#e6e4dd', via: '#e0ded7', to: '#d3d0c7', ink: '#16150f', inkMuted: '#484640', label: 'Overcast sky' },
  rain: { from: '#dedcd6', via: '#d7d5cf', to: '#c8c5bd', ink: '#141309', inkMuted: '#454338', label: 'Rainy sky' },
  snow: { from: '#f4f4f2', via: '#eeeeec', to: '#e0e0dc', ink: '#16150f', inkMuted: '#4a4840', label: 'Snowy sky' },
  storm: { from: '#cfccc4', via: '#c5c2b9', to: '#b3afa5', ink: '#100f08', inkMuted: '#3a382e', label: 'Stormy sky' },
  fog: { from: '#e8e8e6', via: '#e1e1de', to: '#d4d4d0', ink: '#16150f', inkMuted: '#474640', label: 'Foggy sky' },
};

const NIGHT: ConditionPalettes = {
  sunny: { from: '#1a1a16', via: '#0d0d0b', to: '#000000', ink: '#f5f3ee', inkMuted: '#a5a299', label: 'Clear night sky' },
  'partly-cloudy': { from: '#181815', via: '#0c0c0a', to: '#000000', ink: '#f2f0eb', inkMuted: '#a29f96', label: 'Partly cloudy night sky' },
  cloudy: { from: '#151513', via: '#0a0a09', to: '#000000', ink: '#efede8', inkMuted: '#9f9c93', label: 'Overcast night sky' },
  rain: { from: '#121211', via: '#090908', to: '#000000', ink: '#ecebe6', inkMuted: '#9c9990', label: 'Rainy night sky' },
  snow: { from: '#1c1c1a', via: '#0e0e0d', to: '#000000', ink: '#f7f6f2', inkMuted: '#a8a59c', label: 'Snowy night sky' },
  storm: { from: '#0e0e0d', via: '#070706', to: '#000000', ink: '#e9e7e2', inkMuted: '#99968d', label: 'Stormy night sky' },
  fog: { from: '#191918', via: '#0d0d0c', to: '#000000', ink: '#f0efec', inkMuted: '#a09e97', label: 'Foggy night sky' },
};

/** Used before any weather has loaded, and whenever the condition is unknown. */
export const NEUTRAL_ATMOSPHERE: AtmospherePalette = {
  from: '#eceae4',
  via: '#f4f3f0',
  to: '#e4e1d9',
  ink: '#16150f',
  inkMuted: '#4a4840',
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
