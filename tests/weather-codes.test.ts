import { describe, expect, it } from 'vitest';
import { describeWeatherCode } from '@/lib/weather/weather-codes';

describe('describeWeatherCode', () => {
  it('maps clear sky to sunny', () => {
    expect(describeWeatherCode(0)).toEqual({ condition: 'sunny', label: 'Clear sky' });
  });

  it('maps partly cloudy and overcast codes', () => {
    expect(describeWeatherCode(2)).toEqual({ condition: 'partly-cloudy', label: 'Partly cloudy' });
    expect(describeWeatherCode(3)).toEqual({ condition: 'cloudy', label: 'Overcast' });
  });

  it('maps fog codes', () => {
    expect(describeWeatherCode(45).condition).toBe('fog');
    expect(describeWeatherCode(48).condition).toBe('fog');
  });

  it('maps rain and drizzle codes to rain', () => {
    for (const code of [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]) {
      expect(describeWeatherCode(code).condition).toBe('rain');
    }
  });

  it('maps snow codes to snow', () => {
    for (const code of [71, 73, 75, 77, 85, 86]) {
      expect(describeWeatherCode(code).condition).toBe('snow');
    }
  });

  it('maps thunderstorm codes to storm', () => {
    for (const code of [95, 96, 99]) {
      expect(describeWeatherCode(code).condition).toBe('storm');
    }
  });

  it('falls back to a safe default for unknown codes', () => {
    expect(describeWeatherCode(9999)).toEqual({ condition: 'cloudy', label: 'Unknown' });
  });

  it('falls back to a safe default for null or undefined', () => {
    expect(describeWeatherCode(null)).toEqual({ condition: 'cloudy', label: 'Unknown' });
    expect(describeWeatherCode(undefined)).toEqual({ condition: 'cloudy', label: 'Unknown' });
  });
});
