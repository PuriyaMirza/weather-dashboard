import { describe, expect, it } from 'vitest';
import {
  HERO_ART,
  HERO_TEXT_TOP,
  NEUTRAL_ATMOSPHERE,
  atmosphereStyle,
  conditionShortLabel,
  getAtmosphere,
  inferIsDay,
  skyHeadline,
  timeOfDay,
  type AtmospherePalette,
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
    expect(style['--sky-ink-muted']).toBeTruthy();
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

function channels(hex: string): number[] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function toHex(rgb: number[]): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/** Source-over compositing, which browsers perform in sRGB space. */
function over(top: string, opacity: number, bottom: string): string {
  const [a, b] = [channels(top), channels(bottom)];
  return toHex(a.map((channel, index) => channel * opacity + b[index] * (1 - opacity)));
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * Every colour that can end up directly behind the hero's heading and body: the sky below
 * HERO_TEXT_TOP (its `via` and `to` stops — the gradient between them is bounded by the two), the
 * fog banks and the fog glow layered over it, each under the mist at its thinnest, plus the mist at
 * full strength (the very bottom of the art). Mist opacity only moves the result linearly between
 * those extremes, so checking both ends covers everything in between.
 */
function backdropsBehindText(palette: AtmospherePalette): string[] {
  const [backBand, frontBand] = HERO_ART.fogBands;
  const { fogGlow, mist } = HERO_ART;
  const layers: string[] = [];
  for (const sky of [palette.via, palette.to]) {
    const back = over(backBand.color, backBand.opacity, sky);
    const front = over(frontBand.color, frontBand.opacity, back);
    for (const base of [sky, back, front]) {
      layers.push(base, over(fogGlow.color, fogGlow.opacity, base));
    }
  }
  return [...layers.map((layer) => over(mist.color, mist.minOpacityBehindText, layer)), mist.color];
}

/**
 * A redesign's most likely accessibility regression is contrast, and the hero sets its heading and
 * body straight onto the illustration. Asserting it here means a palette or art tweak can't quietly
 * break it.
 */
describe('hero text contrast against every sky', () => {
  const palettes = [
    NEUTRAL_ATMOSPHERE,
    ...CONDITIONS.flatMap((condition) => [getAtmosphere(condition, true), getAtmosphere(condition, false)]),
  ];

  it('meets WCAG AA for heading and body ink on everything behind the text, day and night', () => {
    for (const palette of palettes) {
      for (const background of backdropsBehindText(palette)) {
        for (const foreground of [palette.ink, palette.inkMuted]) {
          expect(
            contrastRatio(foreground, background),
            `${palette.label}: ${foreground} on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('keeps nights darker than days, so time of day reads as weight as well as in words', () => {
    for (const condition of CONDITIONS) {
      const day = getAtmosphere(condition, true);
      const night = getAtmosphere(condition, false);
      expect(relativeLuminance(night.from)).toBeLessThan(relativeLuminance(day.from));
      expect(relativeLuminance(night.via)).toBeLessThan(relativeLuminance(day.via));
    }
  });

  it('places the text boundary inside the art', () => {
    expect(HERO_TEXT_TOP).toBeGreaterThan(0);
    expect(HERO_TEXT_TOP).toBeLessThan(1);
  });
});

describe('timeOfDay', () => {
  const zone = 'America/Los_Angeles';

  it('splits daylight into morning, afternoon and evening by the local clock', () => {
    expect(timeOfDay('2026-07-18T09:00:00-07:00', true, zone)).toBe('Morning');
    expect(timeOfDay('2026-07-18T15:00:00-07:00', true, zone)).toBe('Afternoon');
    expect(timeOfDay('2026-07-18T19:30:00-07:00', true, zone)).toBe('Evening');
  });

  it('calls early darkness evening and late darkness night', () => {
    expect(timeOfDay('2026-12-18T18:00:00-08:00', false, zone)).toBe('Evening');
    expect(timeOfDay('2026-12-18T23:00:00-08:00', false, zone)).toBe('Night');
    expect(timeOfDay('2026-12-18T04:00:00-08:00', false, zone)).toBe('Night');
  });

  it("reads the hour at the location, not in the viewer's zone", () => {
    // 15:00 in Los Angeles is 07:00 the next morning in Tokyo.
    expect(timeOfDay('2026-07-18T15:00:00-07:00', true, 'Asia/Tokyo')).toBe('Morning');
  });

  it('falls back to day or night rather than guessing when the time is unreadable', () => {
    expect(timeOfDay('nonsense', true, zone)).toBe('Day');
    expect(timeOfDay('nonsense', false, zone)).toBe('Night');
  });
});

describe('skyHeadline and conditionShortLabel', () => {
  it('names the condition and the part of the day', () => {
    expect(skyHeadline('partly-cloudy', true, '2026-07-18T15:00:00-07:00', 'America/Los_Angeles')).toBe(
      'Partly Cloudy Afternoon',
    );
    expect(skyHeadline('sunny', false, '2026-07-18T23:00:00-07:00', 'America/Los_Angeles')).toBe('Clear Night');
  });

  it('never calls a night sunny', () => {
    expect(skyHeadline('sunny', false, '2026-07-18T21:00:00-07:00', 'America/Los_Angeles')).not.toMatch(/sunny/i);
    expect(conditionShortLabel('sunny', false)).toBe('Clear');
  });

  it('has a word short enough for an hour pill for every condition', () => {
    for (const condition of CONDITIONS) {
      expect(conditionShortLabel(condition).length).toBeLessThanOrEqual(8);
    }
  });
});
