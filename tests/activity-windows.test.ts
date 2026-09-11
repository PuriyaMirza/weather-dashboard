import { describe, expect, it } from 'vitest';
import { ACTIVITIES, findActivityWindows, type ActivityId } from '@/lib/weather/activity-windows';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { HourlyPoint, WeatherDashboardData } from '@/lib/weather/types';

const OFFSET = '-07:00';

/** A pleasant hour. Individual tests spoil exactly the field they care about. */
function hour(hourOfDay: number, overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time: `2026-07-18T${String(hourOfDay).padStart(2, '0')}:00:00${OFFSET}`,
    temperatureF: 70,
    feelsLikeF: 70,
    precipitationChance: 0,
    condition: 'sunny',
    precipitationInches: 0,
    windMph: 5,
    windGustMph: 8,
    windDirection: 'NW',
    cloudCoverPercent: 10,
    pressureInHg: 30,
    uvIndex: 3,
    ...overrides,
  };
}

function forecast(hours: HourlyPoint[], sunset = `2026-07-18T20:00:00${OFFSET}`): WeatherDashboardData {
  return {
    ...mockWeatherData,
    hourly: hours,
    sun: { ...mockWeatherData.sun!, sunset },
  };
}

function outlook(data: WeatherDashboardData, activity: ActivityId) {
  const found = findActivityWindows(data).find((entry) => entry.definition.id === activity);
  if (!found) throw new Error(`no outlook produced for ${activity}`);
  return found;
}

describe('findActivityWindows', () => {
  it('covers every defined activity, so none can be silently dropped', () => {
    const results = findActivityWindows(forecast([hour(12), hour(13), hour(14)]));
    expect(results.map((entry) => entry.definition.id)).toEqual(ACTIVITIES.map((activity) => activity.id));
  });

  it('reports a contiguous run rather than the single best hour', () => {
    const data = forecast([hour(12), hour(13), hour(14), hour(15)]);
    const { window } = outlook(data, 'walk');

    expect(window?.start).toBe(`2026-07-18T12:00:00${OFFSET}`);
    // Exclusive end: the 15:00 hour finishes at 16:00.
    expect(window?.end).toBe(`2026-07-18T16:00:00${OFFSET}`);
    expect(window?.hours).toBe(4);
  });

  it('breaks the run at an unsuitable hour instead of spanning it', () => {
    // 13:00 is a downpour, so the afternoon run cannot include it.
    const data = forecast([
      hour(12),
      hour(13, { precipitationChance: 90 }),
      hour(14),
      hour(15),
      hour(16),
    ]);

    const { window } = outlook(data, 'walk');
    expect(window?.start).toBe(`2026-07-18T14:00:00${OFFSET}`);
    expect(window?.hours).toBe(3);
  });

  /**
   * The rule that keeps this feature trustworthy. Offering the least-bad hour of a storm is the
   * same failure as inventing a missing reading — the module has to be willing to say "no".
   */
  it('returns nothing when no hour clears the bar, rather than the least-bad hour', () => {
    const soaked = [12, 13, 14, 15].map((h) => hour(h, { precipitationChance: 95, windMph: 40 }));

    for (const activity of ACTIVITIES) {
      expect(outlook(forecast(soaked), activity.id).window, `${activity.id} invented a window`).toBeNull();
    }
  });

  it('does not offer a run shorter than the activity needs', () => {
    // Gardening asks for two hours; a single good hour between showers is not a window.
    const data = forecast([
      hour(12, { precipitationChance: 90 }),
      hour(13),
      hour(14, { precipitationChance: 90 }),
    ]);

    expect(outlook(data, 'garden').window).toBeNull();
    // The same single hour is enough for a walk.
    expect(outlook(data, 'walk').window?.hours).toBe(1);
  });

  it('keeps gardening bounded to daylight', () => {
    const evening = [18, 19, 20, 21].map((h) => hour(h, { feelsLikeF: 60, uvIndex: 0 }));
    const data = forecast(evening, `2026-07-18T20:00:00${OFFSET}`);

    // Sunset is 20:00, so gardening only has 18:00 and 19:00 — exactly its two-hour minimum. It
    // never straddles sunset in the first place, so neither dark field is set.
    const garden = outlook(data, 'garden').window;
    expect(garden?.hours).toBe(2);
    expect(garden?.end).toBe(`2026-07-18T20:00:00${OFFSET}`);
    expect(garden?.darkFrom).toBeNull();
    expect(garden?.extendsUntil).toBeNull();
  });

  it('splits a straddling run at sunset when the daylight portion alone is enough, without dropping the rest', () => {
    const evening = [18, 19, 20, 21].map((h) => hour(h, { feelsLikeF: 60, uvIndex: 0 }));
    const data = forecast(evening, `2026-07-18T20:00:00${OFFSET}`);

    // Running has no daylight requirement, and its whole evening (18:00–22:00) clears the bar. But
    // its one-hour minimum is already met by 18:00–20:00 alone, so that's the reported window — a
    // span ending mid-evening reads better than one silently covering both daylight and dark. The
    // two hours after sunset are still surfaced, just separately.
    const run = outlook(data, 'run').window;
    expect(run?.start).toBe(`2026-07-18T18:00:00${OFFSET}`);
    expect(run?.hours).toBe(2);
    expect(run?.end).toBe(`2026-07-18T20:00:00${OFFSET}`);
    expect(run?.darkFrom).toBeNull();
    expect(run?.extendsUntil).toBe(`2026-07-18T22:00:00${OFFSET}`);
  });

  it('reports a run entirely after dark as such, with no extension to speak of', () => {
    const lateEvening = [19, 20, 21].map((h) => hour(h, { feelsLikeF: 60, uvIndex: 0 }));
    const data = forecast(lateEvening, `2026-07-18T18:00:00${OFFSET}`);

    const run = outlook(data, 'run').window;
    expect(run?.hours).toBe(3);
    expect(run?.darkFrom).toBe(`2026-07-18T18:00:00${OFFSET}`);
    expect(run?.extendsUntil).toBeNull();
  });

  it('leaves a run that never reaches sunset with both dark fields null', () => {
    const data = forecast([hour(12), hour(13), hour(14)], `2026-07-18T22:00:00${OFFSET}`);

    const walk = outlook(data, 'walk').window;
    expect(walk?.darkFrom).toBeNull();
    expect(walk?.extendsUntil).toBeNull();
  });

  it('fails a threshold it cannot evaluate rather than passing by default', () => {
    // "We don't know the wind" is not "the wind is fine" — on a bike that is the whole point.
    const unknownWind = [12, 13, 14].map((h) => hour(h, { windMph: null, windGustMph: null }));
    expect(outlook(forecast(unknownWind), 'cycle').window).toBeNull();
    expect(outlook(forecast(unknownWind), 'walk').window).toBeNull();
  });

  it('holds cycling to its gust limit even when average wind looks calm', () => {
    const gusty = [12, 13, 14].map((h) => hour(h, { windMph: 8, windGustMph: 35 }));

    expect(outlook(forecast(gusty), 'cycle').window).toBeNull();
    // A walk has no gust rule, so the same hours still work on foot.
    expect(outlook(forecast(gusty), 'walk').window?.hours).toBe(3);
  });

  it('explains its choice in words, never by colour alone', () => {
    const data = forecast([hour(12), hour(13), hour(14)]);
    const reasons = outlook(data, 'walk').window?.reasons ?? [];

    expect(reasons.join(' ')).toMatch(/no rain expected/i);
    expect(reasons.join(' ')).toMatch(/feels like/i);
    expect(reasons.join(' ')).toMatch(/wind under/i);
  });

  it('survives an empty forecast without inventing anything', () => {
    const results = findActivityWindows(forecast([]));
    expect(results.every((entry) => entry.window === null)).toBe(true);
  });

  it('still works when sunset is unknown, without excluding every hour', () => {
    const data = { ...forecast([hour(12), hour(13), hour(14)]), sun: null };
    // A missing sunset must not silently make daylight activities impossible.
    expect(outlook(data, 'garden').window?.hours).toBe(3);
  });
});
