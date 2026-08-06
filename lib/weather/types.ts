export type WeatherCondition = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';

export interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface CurrentConditions {
  observedAt: string;
  condition: WeatherCondition;
  conditionLabel: string;
  temperatureF: number;
  feelsLikeF: number;
  highF: number;
  lowF: number;
  windMph: number;
  windDirection: string;
  precipitationChance: number;
}

export interface ComfortMetrics {
  humidityPercent: number;
  dewPointF: number;
  uvIndex: number | null;
  visibilityMiles: number;
  pressureInHg: number;
  airQualityIndex: number | null;
}

export interface HourlyTemperaturePoint {
  time: string;
  temperatureF: number;
  feelsLikeF: number;
  precipitationChance: number;
  condition: WeatherCondition;
}

export interface WeatherDashboardData {
  location: WeatherLocation;
  current: CurrentConditions | null;
  comfort: ComfortMetrics | null;
  hourly: HourlyTemperaturePoint[];
  updatedAt: string;
  source: 'mock' | 'open-meteo';
}

export type WeatherDataStatus = 'loading' | 'error' | 'ready';

export interface WeatherDataState {
  status: WeatherDataStatus;
  data?: WeatherDashboardData;
  errorMessage?: string;
}
