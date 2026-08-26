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
  /** Drives the day/night atmosphere. Null when the provider didn't report it (e.g. older payloads). */
  isDay: boolean | null;
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

export interface WindMetrics {
  speedMph: number | null;
  gustMph: number | null;
  directionDegrees: number | null;
  direction: string | null;
}

export type PressureTrend = 'rising' | 'falling' | 'steady';

export interface AtmosphericMetrics {
  pressureInHg: number | null;
  /** Derived by comparing the earliest and latest hourly pressure readings available. */
  pressureTrend: PressureTrend | null;
  visibilityMiles: number | null;
  cloudCoverPercent: number | null;
  humidityPercent: number | null;
  dewPointF: number | null;
}

/** US AQI categories, per the EPA scale. Always rendered with the word, never colour alone. */
export type AirQualityCategory = 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous';

export interface AirQualityMetrics {
  usAqi: number | null;
  europeanAqi: number | null;
  category: AirQualityCategory | null;
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
  sulphurDioxide: number | null;
  carbonMonoxide: number | null;
}

export interface SunMetrics {
  sunrise: string | null;
  sunset: string | null;
  daylightSeconds: number | null;
  uvIndexMax: number | null;
  uvIndexNow: number | null;
}

/**
 * One hour of the forecast. The first five fields are required — an hour without them is dropped
 * during normalization rather than rendered with invented values. The rest are nullable so a
 * single missing variable costs one metric, not the whole hour.
 */
export interface HourlyPoint {
  time: string;
  temperatureF: number;
  feelsLikeF: number;
  precipitationChance: number;
  condition: WeatherCondition;
  precipitationInches: number | null;
  windMph: number | null;
  windGustMph: number | null;
  windDirection: string | null;
  cloudCoverPercent: number | null;
  pressureInHg: number | null;
}

export interface DailyForecastDay {
  date: string;
  condition: WeatherCondition;
  conditionLabel: string;
  highF: number;
  lowF: number;
  precipitationChance: number | null;
  precipitationInches: number | null;
  windMaxMph: number | null;
  sunrise: string | null;
  sunset: string | null;
  uvIndexMax: number | null;
}

export interface WeatherDashboardData {
  location: WeatherLocation;
  current: CurrentConditions | null;
  comfort: ComfortMetrics | null;
  wind: WindMetrics | null;
  atmospheric: AtmosphericMetrics | null;
  sun: SunMetrics | null;
  /**
   * Null whenever air quality is unavailable — it comes from a separate upstream API, so it is
   * allowed to fail without taking the forecast down with it.
   */
  airQuality: AirQualityMetrics | null;
  hourly: HourlyPoint[];
  daily: DailyForecastDay[];
  updatedAt: string;
  source: 'mock' | 'open-meteo';
}

export type WeatherDataStatus = 'loading' | 'error' | 'ready';

export interface WeatherDataState {
  status: WeatherDataStatus;
  data?: WeatherDashboardData;
  errorMessage?: string;
}
