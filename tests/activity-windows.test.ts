import { describe, expect, it } from 'vitest';
import {
  ACTIVITIES,
  WAKING_HOURS,
  findActivityWindows,
  findNextWindow,
  type ActivityId,
} from '@/lib/weather/activity-windows';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { DailyForecastDay, HourlyPoint, WeatherDashboardData } from '@/lib/weather/types';

const OFFSET = '-07:00';

/** A pleasant hour on a given local date. Individual tests spoil exactly the field they care about. */
function hourOn(date: string, hourOfDay: number, overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time: `${date}T${String(hourOfDay).padStart(2, '0')}:00:00${OFFSET}`,
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

function hour(hourOfDay: number, overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return hourOn('2026-07-18', hourOfDay, overrides);
}

function forecast(
  hours: HourlyPoint[],
  sunset = `2026-07-18T20:00:00${OFFSET}`,
  sunrise: string | null = `2026-07-18T05:35:00${OFFSET}`,
): WeatherDashboardData {
  return {
    ...mockWeatherData,
    hourly: hours,
    forecastHours: hours,
    sun: { ...mockWeatherData.sun!, sunrise, sunset },
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

describe('findActivityWindows — daylight starts at sunrise', () => {
  it('keeps gardening from opening before sunrise', () => {
    const morning = [6, 7, 8, 9].map((h) => hour(h));
    const data = forecast(morning, `2026-07-18T20:00:00${OFFSET}`, `2026-07-18T07:30:00${OFFSET}`);

    // The 7 AM hour starts in the dark (sunrise 7:30), so gardening opens at 8 AM, not 6 or 7.
    const garden = outlook(data, 'garden').window;
    expect(garden?.start).toBe(`2026-07-18T08:00:00${OFFSET}`);
    expect(garden?.hours).toBe(2);

    // Walking has no daylight requirement, so the same morning is fine from 6 AM.
    expect(outlook(data, 'walk').window?.start).toBe(`2026-07-18T06:00:00${OFFSET}`);
  });

  it('counts the hour that starts exactly at sunrise as daylight', () => {
    const data = forecast([7, 8].map((h) => hour(h)), `2026-07-18T20:00:00${OFFSET}`, `2026-07-18T07:00:00${OFFSET}`);
    expect(outlook(data, 'garden').window?.start).toBe(`2026-07-18T07:00:00${OFFSET}`);
  });

  it('finds no garden window when the only good hours are before sunrise', () => {
    const data = forecast([6, 7].map((h) => hour(h)), `2026-07-18T20:00:00${OFFSET}`, `2026-07-18T08:10:00${OFFSET}`);
    expect(outlook(data, 'garden').window).toBeNull();
  });

  it('does not bound by sunrise when sunrise is unknown', () => {
    const data = forecast([6, 7].map((h) => hour(h)), `2026-07-18T20:00:00${OFFSET}`, null);
    expect(outlook(data, 'garden').window?.start).toBe(`2026-07-18T06:00:00${OFFSET}`);
  });
});

/**
 * The small hours are often the calmest and driest of the day. Weather-wise a 1–5 AM walk is
 * perfect; as advice it is useless, so it must never be the answer.
 */
describe('findActivityWindows — waking hours', () => {
  it('declares the bound as 6 AM up to, not including, 10 PM', () => {
    expect(WAKING_HOURS).toEqual({ start: 6, end: 22 });
  });

  it('offers no window for a perfect stretch in the small hours', () => {
    // A null sun keeps daylight out of it: this is purely the waking-hours bound.
    const smallHours = { ...forecast([1, 2, 3, 4, 5].map((h) => hour(h))), sun: null };

    for (const activity of ACTIVITIES) {
      expect(outlook(smallHours, activity.id).window, `${activity.id} suggested the small hours`).toBeNull();
    }
  });

  it('runs a perfect day from the 6 AM hour through the 9 PM hour', () => {
    const allDay = { ...forecast(Array.from({ length: 24 }, (_, h) => hour(h))), sun: null };

    const walk = outlook(allDay, 'walk').window;
    expect(walk?.start).toBe(`2026-07-18T06:00:00${OFFSET}`);
    expect(walk?.end).toBe(`2026-07-18T22:00:00${OFFSET}`);
    expect(walk?.hours).toBe(16);
  });

  it('reads the hour from the location’s own clock, not the viewer’s', () => {
    // 3 AM at UTC-7 is 7 PM in Tokyo. Read through Date in the viewer's zone these would look like
    // waking hours; read off the timestamp, they are the middle of the night.
    const originalTimeZone = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';
    try {
      const data = { ...forecast([3, 4].map((h) => hour(h))), sun: null };
      expect(outlook(data, 'walk').window).toBeNull();
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });

  it('never joins the evening to the next morning across the excluded night', () => {
    const overnight = [
      ...[20, 21, 22, 23].map((h) => hourOn('2026-07-18', h)),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((h) => hourOn('2026-07-19', h)),
    ];
    const data = { ...forecast(overnight), sun: null };

    // Two separate two-hour runs (8–10 PM, then 6–8 AM). Filtering the night out first would have
    // made them look like one four-hour window; the earlier of two equal runs wins.
    const walk = outlook(data, 'walk').window;
    expect(walk?.start).toBe(`2026-07-18T20:00:00${OFFSET}`);
    expect(walk?.end).toBe(`2026-07-18T22:00:00${OFFSET}`);
    expect(walk?.hours).toBe(2);
  });

  it('never joins a run across an hour missing from the series', () => {
    // The normalizer drops an hour it can't fully read; that hour is unknown, not suitable.
    const withGap = [hour(12), hour(13), hour(15), hour(16), hour(17)];
    const walk = outlook({ ...forecast(withGap), sun: null }, 'walk').window;

    expect(walk?.start).toBe(`2026-07-18T15:00:00${OFFSET}`);
    expect(walk?.hours).toBe(3);
  });
});

describe('findNextWindow', () => {
  const DAYS = ['2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21'];

  function dailyRow(date: string, overrides: Partial<DailyForecastDay> = {}): DailyForecastDay {
    return {
      ...mockWeatherData.daily[0],
      date,
      sunrise: `${date}T05:40:00${OFFSET}`,
      sunset: `${date}T20:45:00${OFFSET}`,
      ...overrides,
    };
  }

  /**
   * A week whose every hour is a downpour unless `good` names its date, in which case that date's
   * hours listed there are pleasant. `hourly` is the first 24 hours, as the normalizer builds it.
   */
  function week(good: Record<string, number[]>, daily = DAYS.map((date) => dailyRow(date))): WeatherDashboardData {
    const forecastHours = DAYS.flatMap((date) =>
      Array.from({ length: 24 }, (_, h) =>
        good[date]?.includes(h) ? hourOn(date, h) : hourOn(date, h, { precipitationChance: 95 }),
      ),
    );
    return {
      ...mockWeatherData,
      hourly: forecastHours.slice(0, 24),
      forecastHours,
      daily,
      sun: { ...mockWeatherData.sun!, sunrise: daily[0].sunrise, sunset: daily[0].sunset },
    };
  }

  it('returns the first later day that has a window, with that window', () => {
    const data = week({ '2026-07-20': [9, 10, 11], '2026-07-21': [9, 10, 11, 12, 13] });

    const next = findNextWindow(data, 'walk');
    expect(next?.date).toBe('2026-07-20');
    expect(next?.window.start).toBe(`2026-07-20T09:00:00${OFFSET}`);
    expect(next?.window.end).toBe(`2026-07-20T12:00:00${OFFSET}`);
    expect(next?.window.hours).toBe(3);
  });

  it('looks only after today, even when today has a window', () => {
    const data = week({ '2026-07-18': [9, 10, 11] });
    expect(outlook(data, 'walk').window).not.toBeNull();
    expect(findNextWindow(data, 'walk')).toBeNull();
  });

  it('returns null rather than the least-bad hour when no later day clears the bar', () => {
    const data = week({});
    for (const activity of ACTIVITIES) {
      expect(findNextWindow(data, activity.id), `${activity.id} invented a window`).toBeNull();
    }
  });

  it('skips a day whose only good stretch is outside waking hours', () => {
    const data = week({ '2026-07-19': [1, 2, 3, 4], '2026-07-20': [14, 15] });
    expect(findNextWindow(data, 'walk')?.date).toBe('2026-07-20');
  });

  it('judges each day against its own sunrise and sunset, not today’s', () => {
    // An improbably short day on the 19th makes the point: if today's sun (05:40–20:45 on the
    // 18th) were used, every hour on the 19th would count as after dark and gardening would find
    // nothing; ignoring the sun entirely would open at 6 AM.
    const daily = DAYS.map((date) =>
      date === '2026-07-19'
        ? dailyRow(date, { sunrise: `${date}T09:30:00${OFFSET}`, sunset: `${date}T12:00:00${OFFSET}` })
        : dailyRow(date),
    );
    const data = week({ '2026-07-19': Array.from({ length: 24 }, (_, h) => h) }, daily);

    const garden = findNextWindow(data, 'garden');
    expect(garden?.date).toBe('2026-07-19');
    expect(garden?.window.start).toBe(`2026-07-19T10:00:00${OFFSET}`);
    expect(garden?.window.end).toBe(`2026-07-19T12:00:00${OFFSET}`);

    // An activity without the daylight rule is split at that day's sunset, not today's.
    const walk = findNextWindow(data, 'walk');
    expect(walk?.window.start).toBe(`2026-07-19T06:00:00${OFFSET}`);
    expect(walk?.window.end).toBe(`2026-07-19T12:00:00${OFFSET}`);
    expect(walk?.window.extendsUntil).toBe(`2026-07-19T22:00:00${OFFSET}`);
  });
});
