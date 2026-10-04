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
  forecastHours: [],
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

  /**
   * The gap between two temperatures is a difference, not a reading. It used to print the raw
   * Fahrenheit gap whatever the unit, so a Celsius dashboard showing 23° beside 22° claimed "2°
   * warmer".
   */
  it('states the feels-like gap in the chosen unit', () => {
    const feelsLike = getMetricModule('feels-like')!;
    const withGap = (temperatureF: number, feelsLikeF: number): WeatherDashboardData => ({
      ...mockWeatherData,
      current: { ...mockWeatherData.current!, temperatureF, feelsLikeF },
    });

    // mockWeatherData: 72°F, feels like 74°F.
    expect(feelsLike.read(mockWeatherData, 'imperial')?.detail).toBe('2° warmer than the actual temperature');
    expect(feelsLike.read(mockWeatherData, 'metric')?.detail).toBe('1° warmer than the actual temperature');

    expect(feelsLike.read(withGap(72, 63), 'imperial')?.detail).toBe('9° cooler than the actual temperature');
    expect(feelsLike.read(withGap(72, 63), 'metric')?.detail).toBe('5° cooler than the actual temperature');

    // Under half a degree Celsius is the same, as far as the screen is concerned.
    expect(feelsLike.read(withGap(72, 72.8), 'metric')?.detail).toBe('Same as the actual temperature');
    expect(feelsLike.read(withGap(72, 72), 'imperial')?.detail).toBe('Same as the actual temperature');
  });

  it('gives every reading a header icon', () => {
    for (const metric of METRIC_MODULES) {
      expect(metric.icon, `${metric.id} has no icon`).toBeTruthy();
    }
  });

  /**
   * The progress bar is only honest for metrics with a natural 0–max scale. A bar under a
   * temperature or a pressure would imply a "full" that does not exist.
   */
  it('sets a 0–1 scale only for metrics with a natural maximum', () => {
    const scaled = METRIC_MODULES.filter((metric) => metric.read(mockWeatherData, 'imperial')?.scale != null).map(
      (metric) => metric.id,
    );
    expect(scaled.sort()).toEqual(['air-quality-index', 'cloud-cover', 'humidity', 'precipitation-chance', 'uv-index']);

    for (const metric of METRIC_MODULES) {
      const scale = metric.read(mockWeatherData, 'imperial')?.scale;
      if (scale != null) {
        expect(scale).toBeGreaterThanOrEqual(0);
        expect(scale).toBeLessThanOrEqual(1);
      }
    }
  });

  it('splits a unit off the number without changing the reading', () => {
    const wind = getMetricModule('wind-speed')?.read(mockWeatherData, 'imperial');
    expect(wind?.value).toBe('8');
    expect(wind?.unit).toBe('mph');
    expect(getMetricModule('wind-speed')?.read(mockWeatherData, 'metric')?.unit).toBe('km/h');
    // Strength in words, not only a number.
    expect(wind?.detail).toBe('Moderate, from the NW');
  });

  it('getMetricModule returns undefined for an unknown id rather than throwing', () => {
    expect(getMetricModule('not-a-metric')).toBeUndefined();
  });
});
