import { describe, expect, it } from 'vitest';
import {
  alignForecastDays,
  DEFAULT_COMPARE_LAYOUT,
  describeCurrentDifference,
  isCompareLayout,
  isSamePlace,
  sharedTemperatureScale,
  SIMILAR_SHOWN_DEGREES,
} from '@/lib/weather/compare';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { DailyForecastDay, WeatherDashboardData, WeatherLocation } from '@/lib/weather/types';

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
    sunrise: null,
    sunset: null,
    uvIndexMax: 8,
    ...overrides,
  };
}

const PORTLAND = mockWeatherData.location;
const LISBON: WeatherLocation = {
  name: 'Lisbon',
  region: 'Lisbon',
  country: 'Portugal',
  timezone: 'Europe/Lisbon',
  latitude: 38.71667,
  longitude: -9.13333,
};

/** A forecast for `location` reading `temperatureF` right now; null for no current reading. */
function placeAt(location: WeatherLocation, temperatureF: number | null): WeatherDashboardData {
  return {
    ...mockWeatherData,
    location,
    current: temperatureF === null ? null : { ...mockWeatherData.current!, temperatureF },
  };
}

describe('isCompareLayout', () => {
  it('accepts the two layouts and nothing else', () => {
    expect(isCompareLayout('by-day')).toBe(true);
    expect(isCompareLayout('side-by-side')).toBe(true);
    for (const junk of ['grid', '', 'BY-DAY', null, undefined, 1, {}, ['by-day']]) {
      expect(isCompareLayout(junk)).toBe(false);
    }
  });

  it('defaults to one row per day', () => {
    expect(DEFAULT_COMPARE_LAYOUT).toBe('by-day');
  });
});

describe('isSamePlace', () => {
  it('matches on id, or on coordinates alone', () => {
    expect(isSamePlace(DEFAULT_LOCATION, { ...DEFAULT_LOCATION })).toBe(true);
    expect(isSamePlace(DEFAULT_LOCATION, { ...DEFAULT_LOCATION, id: 'other', name: 'Elsewhere' })).toBe(true);
    // Two geolocation fixes a few metres apart are still "here".
    expect(
      isSamePlace(
        { id: 'current', name: 'Current location', region: '', country: '', latitude: 45.51, longitude: -122.67 },
        { id: 'current', name: 'Current location', region: '', country: '', latitude: 45.5101, longitude: -122.6702 },
      ),
    ).toBe(true);
    expect(isSamePlace(DEFAULT_LOCATION, { ...DEFAULT_LOCATION, id: 'seattle', latitude: 47.6 })).toBe(false);
  });
});

describe('alignForecastDays', () => {
  it('pairs the same dates row by row', () => {
    const a = [day('2026-07-18'), day('2026-07-19')];
    const b = [day('2026-07-18', { highF: 90 }), day('2026-07-19', { highF: 91 })];

    expect(alignForecastDays(a, b)).toEqual([
      { date: '2026-07-18', a: a[0], b: b[0] },
      { date: '2026-07-19', a: a[1], b: b[1] },
    ]);
  });

  /**
   * Tokyo's week opens a calendar day ahead of Portland's. Pairing by position would put Portland's
   * Saturday beside Tokyo's Sunday under one date.
   */
  it('matches by date when one place is a day ahead, leaving each unmatched end empty', () => {
    const portland = [day('2026-07-18'), day('2026-07-19'), day('2026-07-20')];
    const tokyo = [day('2026-07-19'), day('2026-07-20'), day('2026-07-21')];

    const rows = alignForecastDays(portland, tokyo);
    expect(rows.map((row) => row.date)).toEqual(['2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21']);
    expect(rows[0]).toEqual({ date: '2026-07-18', a: portland[0], b: null });
    expect(rows[1]).toEqual({ date: '2026-07-19', a: portland[1], b: tokyo[0] });
    expect(rows.at(-1)).toEqual({ date: '2026-07-21', a: null, b: tokyo[2] });
  });

  it('leaves a gap in one list empty rather than shifting the later days up', () => {
    const a = [day('2026-07-18'), day('2026-07-20')];
    const b = [day('2026-07-18'), day('2026-07-19'), day('2026-07-20')];

    expect(alignForecastDays(a, b)).toEqual([
      { date: '2026-07-18', a: a[0], b: b[0] },
      { date: '2026-07-19', a: null, b: b[1] },
      { date: '2026-07-20', a: a[1], b: b[2] },
    ]);
  });

  it('returns no rows for two empty forecasts, and one-sided rows for one', () => {
    expect(alignForecastDays([], [])).toEqual([]);
    const b = [day('2026-07-18')];
    expect(alignForecastDays([], b)).toEqual([{ date: '2026-07-18', a: null, b: b[0] }]);
  });

  it('sorts the rows by date whatever order the input arrives in', () => {
    const a = [day('2026-07-20'), day('2026-07-18'), day('2026-07-19')];
    const b = [day('2026-07-19'), day('2026-07-21')];

    expect(alignForecastDays(a, b).map((row) => row.date)).toEqual([
      '2026-07-18',
      '2026-07-19',
      '2026-07-20',
      '2026-07-21',
    ]);
  });
});

describe('sharedTemperatureScale', () => {
  it('spans the lowest low and the highest high across both places', () => {
    const a = [day('2026-07-18', { lowF: 55, highF: 70 }), day('2026-07-19', { lowF: 52, highF: 68 })];
    const b = [day('2026-07-18', { lowF: 64, highF: 88 }), day('2026-07-19', { lowF: 66, highF: 91 })];

    expect(sharedTemperatureScale(a, b)).toEqual({ min: 52, max: 91 });
  });

  it('uses whichever list has days when the other is empty', () => {
    expect(sharedTemperatureScale([day('2026-07-18', { lowF: 40, highF: 50 })], [])).toEqual({ min: 40, max: 50 });
  });

  it('is null with no days at all, rather than an invented range', () => {
    expect(sharedTemperatureScale([], [])).toBeNull();
    expect(sharedTemperatureScale()).toBeNull();
  });
});

describe('describeCurrentDifference', () => {
  it('says how much warmer the compared place is', () => {
    expect(describeCurrentDifference(placeAt(PORTLAND, 64), placeAt(LISBON, 70), 'imperial')).toBe(
      'Lisbon is 6° warmer than Portland right now.',
    );
  });

  it('says how much cooler the compared place is', () => {
    expect(describeCurrentDifference(placeAt(PORTLAND, 64), placeAt(LISBON, 60), 'imperial')).toBe(
      'Lisbon is 4° cooler than Portland right now.',
    );
  });

  it('calls shown temperatures one degree apart about the same, and two apart a difference', () => {
    expect(describeCurrentDifference(placeAt(PORTLAND, 64), placeAt(LISBON, 64), 'metric')).toBe(
      'Lisbon and Portland are about the same temperature right now.',
    );
    expect(
      describeCurrentDifference(placeAt(PORTLAND, 64), placeAt(LISBON, 64 + SIMILAR_SHOWN_DEGREES), 'imperial'),
    ).toBe('Lisbon and Portland are about the same temperature right now.');
    expect(
      describeCurrentDifference(placeAt(PORTLAND, 64), placeAt(LISBON, 64 + SIMILAR_SHOWN_DEGREES + 1), 'imperial'),
    ).toBe('Lisbon is 2° warmer than Portland right now.');
  });

  /** Raw 70.4 vs 72.6 is a 2.2° gap, but the cards print 70° and 73° — the sentence must say 3°. */
  it('agrees with the rounded temperatures the cards show', () => {
    expect(describeCurrentDifference(placeAt(PORTLAND, 70.4), placeAt(LISBON, 72.6), 'imperial')).toBe(
      'Lisbon is 3° warmer than Portland right now.',
    );
  });

  /** A gap converts by ×5/9 alone: applying the −32 offset would turn 9°F warmer into 13° cooler. */
  it('converts the gap, not a reading, in metric', () => {
    expect(describeCurrentDifference(placeAt(PORTLAND, 50), placeAt(LISBON, 59), 'metric')).toBe(
      'Lisbon is 5° warmer than Portland right now.',
    );
  });

  it('tells two places with the same name apart by region, then by country', () => {
    const maine: WeatherLocation = { ...PORTLAND, region: 'Maine', latitude: 43.66, longitude: -70.26 };
    expect(describeCurrentDifference(placeAt(PORTLAND, 64), placeAt(maine, 54), 'imperial')).toBe(
      'Portland, Maine is 10° cooler than Portland, Oregon right now.',
    );

    const london: WeatherLocation = { ...LISBON, name: 'London', region: '', country: 'United Kingdom' };
    const londonOntario: WeatherLocation = { ...LISBON, name: 'London', region: '', country: 'Canada' };
    expect(describeCurrentDifference(placeAt(london, 60), placeAt(londonOntario, 70), 'imperial')).toBe(
      'London, Canada is 10° warmer than London, United Kingdom right now.',
    );
  });

  it('says nothing when the two places cannot be told apart by name', () => {
    const twin: WeatherLocation = { ...PORTLAND, latitude: 45.6, longitude: -122.5 };
    expect(describeCurrentDifference(placeAt(PORTLAND, 64), placeAt(twin, 74), 'imperial')).toBeNull();
  });

  it('says nothing when either place has no current reading', () => {
    expect(describeCurrentDifference(placeAt(PORTLAND, null), placeAt(LISBON, 70), 'imperial')).toBeNull();
    expect(describeCurrentDifference(placeAt(PORTLAND, 64), placeAt(LISBON, null), 'imperial')).toBeNull();
  });
});
