import type { WeatherDashboardData, WeatherDataState } from './types';

export const mockWeatherData: WeatherDashboardData = {
  location: {
    name: 'Portland',
    region: 'Oregon',
    country: 'United States',
    timezone: 'America/Los_Angeles',
    latitude: 45.5152,
    longitude: -122.6784,
  },
  current: {
    observedAt: '2026-07-18T15:00:00-07:00',
    condition: 'partly-cloudy',
    conditionLabel: 'Partly cloudy',
    temperatureF: 72,
    feelsLikeF: 74,
    highF: 79,
    lowF: 58,
    windMph: 8,
    windDirection: 'NW',
    precipitationChance: 12,
  },
  comfort: {
    humidityPercent: 54,
    dewPointF: 55,
    uvIndex: 6,
    visibilityMiles: 9.5,
    pressureInHg: 30.08,
    airQualityIndex: 38,
  },
  hourly: [
    { time: '2026-07-18T09:00:00-07:00', temperatureF: 62, feelsLikeF: 62, precipitationChance: 8, condition: 'partly-cloudy' },
    { time: '2026-07-18T10:00:00-07:00', temperatureF: 65, feelsLikeF: 65, precipitationChance: 6, condition: 'partly-cloudy' },
    { time: '2026-07-18T11:00:00-07:00', temperatureF: 68, feelsLikeF: 69, precipitationChance: 8, condition: 'sunny' },
    { time: '2026-07-18T12:00:00-07:00', temperatureF: 70, feelsLikeF: 71, precipitationChance: 10, condition: 'sunny' },
    { time: '2026-07-18T13:00:00-07:00', temperatureF: 72, feelsLikeF: 74, precipitationChance: 12, condition: 'partly-cloudy' },
    { time: '2026-07-18T14:00:00-07:00', temperatureF: 75, feelsLikeF: 76, precipitationChance: 14, condition: 'partly-cloudy' },
    { time: '2026-07-18T15:00:00-07:00', temperatureF: 77, feelsLikeF: 78, precipitationChance: 15, condition: 'cloudy' },
    { time: '2026-07-18T16:00:00-07:00', temperatureF: 76, feelsLikeF: 77, precipitationChance: 18, condition: 'cloudy' },
  ],
  updatedAt: '2026-07-18T15:05:00-07:00',
  source: 'mock',
};

export const mockWeatherState: WeatherDataState = {
  status: 'ready',
  data: mockWeatherData,
};
