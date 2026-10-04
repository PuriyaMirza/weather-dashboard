import { afterEach, describe, expect, it } from 'vitest';
import { laterDayName, listForecastDays, scopeToDay } from '@/lib/weather/forecast-day';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { DailyForecastDay, HourlyPoint, WeatherDashboardData } from '@/lib/weather/types';

const OFFSET = '-07:00';

function day(date: string, overrides: Partial<DailyForecastDay> = {}): DailyForecastDay {
  return {
    date,
    condition: 'sunny',
    conditionLabel: 'Clear sky',
    highF: 80,
    lowF: 60,
    precipitationChance: 5,
    precipitationInches: 0,
    windMaxMph: 10,
    sunrise: `${date}T05:40:00${OFFSET}`,
    sunset: `${date}T20:45:00${OFFSET}`,
    uvIndexMax: 8,
    ...overrides,
  };
}

function hourAt(date: string, hourOfDay: number): HourlyPoint {
  return {
    ...mockWeatherData.hourly[0],
    time: `${date}T${String(hourOfDay).padStart(2, '0')}:00:00${OFFSET}`,
  };
}

/** 2026-07-18 is a Saturday. Hours run from "now" (15:00 Saturday) to the end of Monday. */
const DAILY = [day('2026-07-18'), day('2026-07-19'), day('2026-07-20'), day('2026-07-21')];
const FORECAST_HOURS = [
  ...[15, 16, 17, 18, 19, 20, 21, 22, 23].map((h) => hourAt('2026-07-18', h)),
  ...Array.from({ length: 24 }, (_, h) => hourAt('2026-07-19', h)),
  ...Array.from({ length: 24 }, (_, h) => hourAt('2026-07-20', h)),
];

function weekOf(overrides: Partial<WeatherDashboardData> = {}): WeatherDashboardData {
  return {
    ...mockWeatherData,
    hourly: FORECAST_HOURS.slice(0, 24),
    forecastHours: FORECAST_HOURS,
    daily: DAILY,
    ...overrides,
  };
}

describe('listForecastDays', () => {
  const originalTimeZone = process.env.TZ;
  afterEach(() => {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });

  it('labels today, tomorrow, then short weekdays, one option per daily row', () => {
    expect(listForecastDays(weekOf())).toEqual([
      { date: '2026-07-18', label: 'Today', isToday: true },
      { date: '2026-07-19', label: 'Tomorrow', isToday: false },
      { date: '2026-07-20', label: 'Mon', isToday: false },
      { date: '2026-07-21', label: 'Tue', isToday: false },
    ]);
  });

  it('labels by calendar distance, so a dropped day does not promote the next one to "Tomorrow"', () => {
    const data = weekOf({ daily: [day('2026-07-18'), day('2026-07-20')] });
    expect(listForecastDays(data).map((option) => option.label)).toEqual(['Today', 'Mon']);
  });

  it('derives the weekday from the date string, not from the viewer’s timezone', () => {
    // The two extremes of the UTC offset range: a date parsed or formatted in the viewer's zone
    // would slip a day in at least one of them.
    for (const zone of ['Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
      process.env.TZ = zone;
      expect(listForecastDays(weekOf()).map((option) => option.label), zone).toEqual([
        'Today',
        'Tomorrow',
        'Mon',
        'Tue',
      ]);
    }
  });

  it('offers nothing when there is no daily forecast', () => {
    expect(listForecastDays(weekOf({ daily: [] }))).toEqual([]);
  });
});

describe('scopeToDay', () => {
  it('returns the data itself for no selection or for today, keeping the rolling 24-hour window', () => {
    const data = weekOf();
    expect(scopeToDay(data, null)).toBe(data);
    expect(scopeToDay(data, '2026-07-18')).toBe(data);
  });

  it('returns the data unchanged for a date the forecast does not cover', () => {
    const data = weekOf();
    expect(scopeToDay(data, '2026-08-01')).toBe(data);
  });

  it('narrows hourly to that day’s hours, matched on the location’s local date', () => {
    const scoped = scopeToDay(weekOf(), '2026-07-19');

    expect(scoped.hourly).toHaveLength(24);
    expect(scoped.hourly[0].time).toBe(`2026-07-19T00:00:00${OFFSET}`);
    // 11 PM local is already the next day in UTC (and in most viewers' zones); it still belongs here.
    expect(scoped.hourly[23].time).toBe(`2026-07-19T23:00:00${OFFSET}`);
    expect(scoped.hourly.every((hour) => hour.time.startsWith('2026-07-19'))).toBe(true);
  });

  it('leaves everything that describes the present untouched', () => {
    const data = weekOf();
    const scoped = scopeToDay(data, '2026-07-20');

    expect(scoped).not.toBe(data);
    expect(scoped.current).toBe(data.current);
    expect(scoped.comfort).toBe(data.comfort);
    expect(scoped.airQuality).toBe(data.airQuality);
    expect(scoped.daily).toBe(data.daily);
    expect(scoped.forecastHours).toBe(data.forecastHours);
  });

  it('gives a day beyond the fetched hours an empty series rather than borrowing another day’s', () => {
    expect(scopeToDay(weekOf(), '2026-07-21').hourly).toEqual([]);
  });

  it('rebuilds sun from that day’s row, leaving what it cannot know as null', () => {
    const scoped = scopeToDay(weekOf(), '2026-07-20');

    expect(scoped.sun).toEqual({
      sunrise: `2026-07-20T05:40:00${OFFSET}`,
      sunset: `2026-07-20T20:45:00${OFFSET}`,
      uvIndexMax: 8,
      // "Now" is today's, and the daily row carries no daylight duration — neither is invented.
      uvIndexNow: null,
      daylightSeconds: null,
    });
  });

  it('keeps sun when only some of the day’s fields are present', () => {
    const data = weekOf({ daily: [day('2026-07-18'), day('2026-07-19', { sunrise: null, uvIndexMax: null })] });
    expect(scopeToDay(data, '2026-07-19').sun).toEqual({
      sunrise: null,
      sunset: `2026-07-19T20:45:00${OFFSET}`,
      uvIndexMax: null,
      uvIndexNow: null,
      daylightSeconds: null,
    });
  });

  it('sets sun to null when the day’s row has no sun data at all', () => {
    const data = weekOf({
      daily: [day('2026-07-18'), day('2026-07-19', { sunrise: null, sunset: null, uvIndexMax: null })],
    });
    expect(scopeToDay(data, '2026-07-19').sun).toBeNull();
  });

  it('survives a payload cached from before forecastHours existed', () => {
    const legacy = { ...weekOf(), forecastHours: undefined } as unknown as WeatherDashboardData;
    expect(scopeToDay(legacy, '2026-07-19').hourly).toEqual([]);
  });
});

describe('laterDayName', () => {
  it('spells out a later day’s weekday, tomorrow included', () => {
    expect(laterDayName({ date: '2026-07-19', label: 'Tomorrow', isToday: false })).toBe('Sunday');
    expect(laterDayName({ date: '2026-07-20', label: 'Mon', isToday: false })).toBe('Monday');
  });

  it('is null for today and for no selection, so modules keep their default copy', () => {
    expect(laterDayName({ date: '2026-07-18', label: 'Today', isToday: true })).toBeNull();
    expect(laterDayName(null)).toBeNull();
    expect(laterDayName(undefined)).toBeNull();
  });
});
