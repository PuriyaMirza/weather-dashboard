import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_ATMOSPHERE,
  atmosphereStyle,
  getAtmosphere,
  inferIsDay,
} from '@/lib/weather/atmosphere';
import { ALL_CARD_IDS } from '@/lib/weather/card-layout';
import type { WeatherCondition } from '@/lib/weather/types';

const CONDITIONS: WeatherCondition[] = ['sunny', 'partly-cloudy', 'cloudy', 'rain', 'snow', 'storm', 'fog'];

describe('getAtmosphere', () => {
  it('returns a palette for every condition, day and night', () => {
    for (const condition of CONDITIONS) {
      for (const isDay of [true, false]) {
        const palette = getAtmosphere(condition, isDay);
        expect(palette.from).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.via).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.to).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.label).toBeTruthy();
      }
    }
  });

  it('gives day and night visibly different palettes', () => {
    for (const condition of CONDITIONS) {
      expect(getAtmosphere(condition, true).from).not.toBe(getAtmosphere(condition, false).from);
    }
  });

  it('describes the sky in words, so the gradient is never the only signal', () => {
    expect(getAtmosphere('rain', true).label).toMatch(/rain/i);
    expect(getAtmosphere('sunny', false).label).toMatch(/night/i);
  });

  it('falls back to a neutral palette when the condition is unknown', () => {
    expect(getAtmosphere(null, true)).toEqual(NEUTRAL_ATMOSPHERE);
    expect(getAtmosphere(undefined, false)).toEqual(NEUTRAL_ATMOSPHERE);
  });
});

describe('atmosphereStyle', () => {
  it('exposes the palette as the custom properties the stylesheet consumes', () => {
    const style = atmosphereStyle(getAtmosphere('storm', false)) as Record<string, string>;
    expect(style['--sky-from']).toBeTruthy();
    expect(style['--sky-via']).toBeTruthy();
    expect(style['--sky-to']).toBeTruthy();
    expect(style['--sky-ink']).toBeTruthy();
  });
});

describe('inferIsDay', () => {
  it('is day between sunrise and sunset', () => {
    expect(inferIsDay('2026-07-18T12:00:00-07:00', '2026-07-18T05:35:00-07:00', '2026-07-18T20:52:00-07:00')).toBe(true);
  });

  it('is night before sunrise and after sunset', () => {
    expect(inferIsDay('2026-07-18T03:00:00-07:00', '2026-07-18T05:35:00-07:00', '2026-07-18T20:52:00-07:00')).toBe(false);
    expect(inferIsDay('2026-07-18T22:00:00-07:00', '2026-07-18T05:35:00-07:00', '2026-07-18T20:52:00-07:00')).toBe(false);
  });

  it('assumes day rather than guessing when sun times are missing or unparseable', () => {
    expect(inferIsDay('2026-07-18T12:00:00-07:00', null, null)).toBe(true);
    expect(inferIsDay('2026-07-18T12:00:00-07:00', 'nonsense', 'nonsense')).toBe(true);
  });
});

describe('registry integrity', () => {
  it('includes the air quality card, so saved layouts containing it survive reconciliation', () => {
    expect(ALL_CARD_IDS).toContain('air-quality');
  });
});

/**
 * A redesign's most likely accessibility regression is contrast, and the hero sets text directly
 * on these gradients. Asserting it here means a future palette tweak can't quietly break it.
 */
describe('hero text contrast against every sky', () => {
  function relativeLuminance(hex: string): number {
    const value = hex.replace('#', '');
    const channels = [0, 2, 4].map((offset) => {
      const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrastRatio(a: string, b: string): number {
    const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  }

  it('meets WCAG AA for both ink colours on every gradient stop, day and night', () => {
    for (const condition of CONDITIONS) {
      for (const isDay of [true, false]) {
        const palette = getAtmosphere(condition, isDay);
        for (const background of [palette.from, palette.via, palette.to]) {
          for (const foreground of [palette.ink, palette.inkMuted]) {
            const ratio = contrastRatio(foreground, background);
            expect(
              ratio,
              `${condition} ${isDay ? 'day' : 'night'}: ${foreground} on ${background}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });
});
