import type { OpenMeteoForecastResponse } from './schemas';
import type { ComfortMetrics, CurrentConditions, HourlyTemperaturePoint, WeatherDashboardData, WeatherLocation } from './types';
import { describeWeatherCode } from './weather-codes';

const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const METERS_PER_MILE = 1609.344;
const INCHES_OF_MERCURY_PER_HECTOPASCAL = 0.0295299830714;

export interface OpenMeteoPlace {
  name: string;
  region: string;
  country: string;
}

function degreesToCompass(degrees: number): string {
  const index = Math.round(degrees / 22.5) % COMPASS_POINTS.length;
  return COMPASS_POINTS[(index + COMPASS_POINTS.length) % COMPASS_POINTS.length];
}

function formatUtcOffset(utcOffsetSeconds: number): string {
  const sign = utcOffsetSeconds < 0 ? '-' : '+';
  const absSeconds = Math.abs(utcOffsetSeconds);
  const hours = Math.floor(absSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((absSeconds % 3600) / 60).toString().padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

// Open-Meteo returns local wall-clock times (e.g. "2026-07-18T15:15") without a UTC offset;
// utc_offset_seconds is returned separately so we can produce a proper offset-qualified ISO string.
function toIsoWithOffset(localTime: string, utcOffsetSeconds: number): string {
  const withSeconds = localTime.length === 16 ? `${localTime}:00` : localTime;
  return `${withSeconds}${formatUtcOffset(utcOffsetSeconds)}`;
}

// Finds the hourly index closest to a given local time string. Both inputs are naive local
// times in the same timezone, so parsing them as if they were UTC is safe for a relative diff.
function closestHourlyIndex(hourlyTimes: string[], target: string): number {
  const targetMs = Date.parse(`${target.length === 16 ? `${target}:00` : target}Z`);
  let bestIndex = -1;
  let bestDiff = Infinity;
  hourlyTimes.forEach((time, index) => {
    const ms = Date.parse(`${time.length === 16 ? `${time}:00` : time}Z`);
    const diff = Math.abs(ms - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

function hectopascalsToInchesOfMercury(hectopascals: number): number {
  return hectopascals * INCHES_OF_MERCURY_PER_HECTOPASCAL;
}

function buildCurrentConditions(response: OpenMeteoForecastResponse): CurrentConditions | null {
  const { current, daily, hourly, utc_offset_seconds: utcOffsetSeconds } = response;
  const { temperature_2m: temperatureF, apparent_temperature: feelsLikeF, weather_code: weatherCode, wind_speed_10m: windMph, wind_direction_10m: windDirectionDegrees } = current;

  if (temperatureF == null || feelsLikeF == null || weatherCode == null || windMph == null || windDirectionDegrees == null) {
    return null;
  }

  const highF = daily.temperature_2m_max[0];
  const lowF = daily.temperature_2m_min[0];
  if (highF == null || lowF == null) return null;

  const hourlyIndex = closestHourlyIndex(hourly.time, current.time);
  const precipitationChance = hourlyIndex >= 0 ? hourly.precipitation_probability[hourlyIndex] : null;

  const { condition, label } = describeWeatherCode(weatherCode);

  return {
    observedAt: toIsoWithOffset(current.time, utcOffsetSeconds),
    condition,
    conditionLabel: label,
    temperatureF,
    feelsLikeF,
    highF,
    lowF,
    windMph,
    windDirection: degreesToCompass(windDirectionDegrees),
    // Precipitation probability is a secondary field with no upstream fallback; default to 0
    // rather than dropping the whole current-conditions reading over it being unavailable.
    precipitationChance: precipitationChance ?? 0,
  };
}

function buildComfortMetrics(response: OpenMeteoForecastResponse): ComfortMetrics | null {
  const { current, hourly } = response;
  const { relative_humidity_2m: humidityPercent, pressure_msl: pressureHpa } = current;

  if (humidityPercent == null || pressureHpa == null) return null;

  const hourlyIndex = closestHourlyIndex(hourly.time, current.time);
  if (hourlyIndex < 0) return null;

  const dewPointF = hourly.dew_point_2m[hourlyIndex];
  const visibilityMeters = hourly.visibility[hourlyIndex];
  if (dewPointF == null || visibilityMeters == null) return null;

  return {
    humidityPercent,
    dewPointF,
    uvIndex: hourly.uv_index[hourlyIndex] ?? null,
    visibilityMiles: metersToMiles(visibilityMeters),
    pressureInHg: hectopascalsToInchesOfMercury(pressureHpa),
    // Air quality requires Open-Meteo's separate air-quality API, which this provider doesn't call.
    airQualityIndex: null,
  };
}

function buildHourlyPoints(response: OpenMeteoForecastResponse): HourlyTemperaturePoint[] {
  const { hourly, utc_offset_seconds: utcOffsetSeconds } = response;
  const points: HourlyTemperaturePoint[] = [];

  hourly.time.forEach((time, index) => {
    const temperatureF = hourly.temperature_2m[index];
    const feelsLikeF = hourly.apparent_temperature[index];
    const precipitationChance = hourly.precipitation_probability[index];
    const weatherCode = hourly.weather_code[index];

    if (temperatureF == null || feelsLikeF == null || precipitationChance == null || weatherCode == null) {
      return;
    }

    points.push({
      time: toIsoWithOffset(time, utcOffsetSeconds),
      temperatureF,
      feelsLikeF,
      precipitationChance,
      condition: describeWeatherCode(weatherCode).condition,
    });
  });

  return points;
}

export function normalizeOpenMeteoForecast(response: OpenMeteoForecastResponse, place: OpenMeteoPlace): WeatherDashboardData {
  const location: WeatherLocation = {
    name: place.name,
    region: place.region,
    country: place.country,
    timezone: response.timezone,
    latitude: response.latitude,
    longitude: response.longitude,
  };

  return {
    location,
    current: buildCurrentConditions(response),
    comfort: buildComfortMetrics(response),
    hourly: buildHourlyPoints(response),
    updatedAt: toIsoWithOffset(response.current.time, response.utc_offset_seconds),
    source: 'open-meteo',
  };
}
