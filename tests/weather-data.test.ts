import { describe, expect, it } from 'vitest';
import { mockWeatherData, mockWeatherState } from '@/lib/weather/mock-data';
import type { WeatherDashboardData } from '@/lib/weather/types';

describe('mockWeatherData', () => {
  it('provides normalized dashboard data for the first three cards', () => {
    const data: WeatherDashboardData = mockWeatherData;

    expect(data.source).toBe('mock');
    expect(data.current?.temperatureF).toBeGreaterThan(40);
    expect(data.comfort?.humidityPercent).toBeGreaterThanOrEqual(0);
    expect(data.hourly).toHaveLength(8);
  });

  it('uses the ready state without connecting to a live provider', () => {
    expect(mockWeatherState.status).toBe('ready');
    expect(mockWeatherState.data?.source).toBe('mock');
  });
});
