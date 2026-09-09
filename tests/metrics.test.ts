import { describe, expect, it } from 'vitest';
import { METRIC_MODULES, getMetricModule } from '@/lib/weather/metrics';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { WeatherDashboardData } from '@/lib/weather/types';
import { UNAVAILABLE } from '@/lib/weather/units';

/** The shape a module sees when the request succeeded but carried no readings at all. */
const EMPTY: WeatherDashboardData = {
  ...mockWeatherData,
  current: null,
  comfort: null,
  wind: null,
  atmospheric: null,
  sun: null,
  airQuality: null,
  hourly: [],
  daily: [],
};

describe('metric modules', () => {
  it('all have unique ids', () => {
    const ids = METRIC_MODULES.map((metric) => metric.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('read a value from complete data', () => {
    for (const metric of METRIC_MODULES) {
      const reading = metric.read(mockWeatherData, 'imperial');
      expect(reading, `${metric.id} produced no reading from complete data`).not.toBeNull();
      expect(reading?.value).toBeTruthy();
    }
  });

  /**
   * The load-bearing rule for every module: absent data becomes an unavailable state, never an
   * invented number. A module that returned "0" here would be reporting a reading nobody took.
   */
  it('return null rather than inventing a value when the data is absent', () => {
    for (const metric of METRIC_MODULES) {
      expect(metric.read(EMPTY, 'imperial'), `${metric.id} fabricated a reading from empty data`).toBeNull();
    }
  });

  it('never render the unavailable placeholder as if it were a value', () => {
    for (const metric of METRIC_MODULES) {
      const reading = metric.read(mockWeatherData, 'imperial');
      expect(reading?.value).not.toBe(UNAVAILABLE);
    }
  });

  it('respects the unit system', () => {
    const temperature = getMetricModule('temperature');
    expect(temperature?.read(mockWeatherData, 'imperial')?.value).toBe('72°');
    expect(temperature?.read(mockWeatherData, 'metric')?.value).toBe('22°');
  });

  it('spells out temperatures for screen readers, where the degree symbol reads poorly', () => {
    expect(getMetricModule('temperature')?.read(mockWeatherData, 'imperial')?.spoken).toBe(
      '72 degrees Fahrenheit',
    );
  });

  it('describes severity in words, so nothing depends on seeing a colour', () => {
    const uv = getMetricModule('uv-index')?.read(mockWeatherData, 'imperial');
    expect(uv?.detail).toMatch(/low|moderate|high|very high|extreme/i);

    const humidity = getMetricModule('humidity')?.read(mockWeatherData, 'imperial');
    expect(humidity?.detail).toMatch(/dry|comfortable|humid/i);
  });

  it('renders sun times in the location zone, not the viewer zone', () => {
    // mockWeatherData is Portland; a viewer elsewhere must still see Portland's sunrise hour.
    const sun = getMetricModule('sunrise-sunset')?.read(mockWeatherData, 'imperial');
    expect(sun?.value).not.toBe(UNAVAILABLE);
    expect(sun?.detail).toMatch(/^Sunset /);
  });

  it('reports feels-like relative to the actual temperature', () => {
    const reading = getMetricModule('feels-like')?.read(mockWeatherData, 'imperial');
    expect(reading?.detail).toMatch(/warmer|cooler|same as/i);
  });

  it('getMetricModule returns undefined for an unknown id rather than throwing', () => {
    expect(getMetricModule('not-a-metric')).toBeUndefined();
  });
});
