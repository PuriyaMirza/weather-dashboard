import { describe, expect, it } from 'vitest';
import {
  UNAVAILABLE,
  describeTemperature,
  formatDistance,
  formatDuration,
  formatHour,
  formatIndex,
  formatPercent,
  formatPrecipitation,
  formatPressure,
  formatSpeed,
  formatTemperature,
  formatTemperatureWithUnit,
  formatTime,
  formatWeekday,
  toCelsius,
  toHectopascals,
  toKilometres,
  toKilometresPerHour,
  toMillimetres,
} from '@/lib/weather/units';

describe('conversions', () => {
  it('converts Fahrenheit to Celsius at known reference points', () => {
    expect(toCelsius(32)).toBeCloseTo(0, 6);
    expect(toCelsius(212)).toBeCloseTo(100, 6);
    expect(toCelsius(-40)).toBeCloseTo(-40, 6);
    expect(toCelsius(72)).toBeCloseTo(22.222, 3);
  });

  it('converts the remaining imperial units', () => {
    expect(toKilometresPerHour(10)).toBeCloseTo(16.09344, 5);
    expect(toMillimetres(1)).toBeCloseTo(25.4, 6);
    expect(toKilometres(1)).toBeCloseTo(1.609344, 6);
    // 29.92 inHg is standard sea-level pressure, ~1013.25 hPa.
    expect(toHectopascals(29.92)).toBeCloseTo(1013.2, 1);
  });
});

describe('formatters — imperial', () => {
  it('formats each quantity in imperial units', () => {
    expect(formatTemperature(72, 'imperial')).toBe('72°');
    expect(formatTemperatureWithUnit(72, 'imperial')).toBe('72°F');
    expect(formatSpeed(8, 'imperial')).toBe('8 mph');
    expect(formatPrecipitation(0.25, 'imperial')).toBe('0.25 in');
    expect(formatDistance(9.5, 'imperial')).toBe('9.5 mi');
    expect(formatPressure(30.08, 'imperial')).toBe('30.08 inHg');
  });
});

describe('formatters — metric', () => {
  it('formats each quantity in metric units', () => {
    expect(formatTemperature(72, 'metric')).toBe('22°');
    expect(formatTemperatureWithUnit(72, 'metric')).toBe('22°C');
    expect(formatSpeed(10, 'metric')).toBe('16 km/h');
    expect(formatPrecipitation(1, 'metric')).toBe('25.4 mm');
    expect(formatDistance(10, 'metric')).toBe('16.1 km');
    expect(formatPressure(29.92, 'metric')).toBe('1013 hPa');
  });
});

describe('formatters — missing data', () => {
  it('never renders a fabricated value when the input is null or undefined', () => {
    for (const system of ['imperial', 'metric'] as const) {
      expect(formatTemperature(null, system)).toBe(UNAVAILABLE);
      expect(formatTemperatureWithUnit(undefined, system)).toBe(UNAVAILABLE);
      expect(formatSpeed(null, system)).toBe(UNAVAILABLE);
      expect(formatPrecipitation(null, system)).toBe(UNAVAILABLE);
      expect(formatDistance(null, system)).toBe(UNAVAILABLE);
      expect(formatPressure(null, system)).toBe(UNAVAILABLE);
      expect(describeTemperature(null, system)).toBe(UNAVAILABLE);
    }
    expect(formatPercent(null)).toBe(UNAVAILABLE);
    expect(formatIndex(null)).toBe(UNAVAILABLE);
    expect(formatDuration(null)).toBe(UNAVAILABLE);
  });

  it('treats zero as a real value, not missing', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPrecipitation(0, 'imperial')).toBe('0.00 in');
    expect(formatIndex(0)).toBe('0');
  });
});

describe('describeTemperature', () => {
  it('spells out the unit for screen readers', () => {
    expect(describeTemperature(72, 'imperial')).toBe('72 degrees Fahrenheit');
    expect(describeTemperature(72, 'metric')).toBe('22 degrees Celsius');
  });
});

describe('formatDuration', () => {
  it('renders hours and minutes', () => {
    expect(formatDuration(55020)).toBe('15h 17m');
    expect(formatDuration(3600)).toBe('1h 0m');
  });
});

describe('formatWeekday', () => {
  it('renders a short weekday from a date-only string without slipping a day', () => {
    // Parsed as local midday, so a negative UTC offset can't roll it back to the previous day.
    expect(formatWeekday('2026-07-18')).toBe('Sat');
  });

  it('reports unavailable for unparseable input', () => {
    expect(formatWeekday(null)).toBe(UNAVAILABLE);
    expect(formatWeekday('not-a-date')).toBe(UNAVAILABLE);
  });
});

/**
 * Times must read as someone standing at the location would read them. Without an explicit zone,
 * Intl uses the *viewer's* zone — so looking up Portland from elsewhere showed Portland's sunrise
 * at the viewer's hour, which is simply wrong information.
 */
describe('formatTime / formatHour — location timezone', () => {
  const PORTLAND_3PM = '2026-07-18T15:00:00-07:00';

  it('renders in the location zone regardless of the viewer', () => {
    expect(formatTime(PORTLAND_3PM, 'America/Los_Angeles')).toBe('3:00 PM');
    expect(formatHour(PORTLAND_3PM, 'America/Los_Angeles')).toBe('3 PM');
  });

  it('shows the same instant differently for a different location', () => {
    // The same moment is the next morning in Tokyo — which is the point of passing the zone.
    expect(formatTime(PORTLAND_3PM, 'Asia/Tokyo')).toBe('7:00 AM');
  });

  it('falls back rather than blanking the time when the zone is unusable', () => {
    expect(formatTime(PORTLAND_3PM, 'Not/AZone')).not.toBe(UNAVAILABLE);
    expect(formatHour(PORTLAND_3PM, 'Not/AZone')).not.toBe(UNAVAILABLE);
  });

  it('still reports unavailable for missing or unparseable timestamps', () => {
    expect(formatTime(null, 'America/Los_Angeles')).toBe(UNAVAILABLE);
    expect(formatHour('nonsense', 'America/Los_Angeles')).toBe(UNAVAILABLE);
  });
});
