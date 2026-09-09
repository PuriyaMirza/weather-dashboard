import type { WeatherDashboardData } from './types';
import {
  UNAVAILABLE,
  describeTemperature,
  formatDistance,
  formatIndex,
  formatPercent,
  formatPressure,
  formatSpeed,
  formatTemperature,
  formatTemperatureWithUnit,
  formatTime,
  type UnitSystem,
} from './units';

/**
 * One reading, ready to render.
 *
 * `spoken` exists because the display form is deliberately terse — "72°" reads as "seventy-two
 * degree" to a screen reader, so anything with a symbol supplies a spelled-out alternative.
 * `qualifier` is always a *word*, never a colour: severity has to survive being read aloud or
 * printed in greyscale.
 */
export interface MetricReading {
  value: string;
  spoken?: string;
  detail?: string;
  qualifier?: string;
}

export type MetricModuleId =
  | 'temperature'
  | 'feels-like'
  | 'precipitation-chance'
  | 'wind-speed'
  | 'humidity'
  | 'dew-point'
  | 'uv-index'
  | 'pressure'
  | 'visibility'
  | 'cloud-cover'
  | 'air-quality-index'
  | 'sunrise-sunset';

export interface MetricModuleDefinition {
  id: MetricModuleId;
  title: string;
  description: string;
  /** Returns null when the underlying data is absent, which the module renders as unavailable. */
  read: (data: WeatherDashboardData, unitSystem: UnitSystem) => MetricReading | null;
}

function describeUv(uvIndex: number): string {
  if (uvIndex < 3) return 'Low';
  if (uvIndex < 6) return 'Moderate';
  if (uvIndex < 8) return 'High';
  if (uvIndex < 11) return 'Very high';
  return 'Extreme';
}

function describeHumidity(percent: number): string {
  if (percent < 30) return 'Dry';
  if (percent < 60) return 'Comfortable';
  if (percent < 75) return 'Humid';
  return 'Very humid';
}

function describeCloudCover(percent: number): string {
  if (percent < 12) return 'Clear';
  if (percent < 40) return 'Mostly clear';
  if (percent < 70) return 'Partly cloudy';
  if (percent < 90) return 'Mostly cloudy';
  return 'Overcast';
}

const AQI_CATEGORY_LABEL: Record<string, string> = {
  good: 'Good',
  moderate: 'Moderate',
  sensitive: 'Unhealthy for sensitive groups',
  unhealthy: 'Unhealthy',
  'very-unhealthy': 'Very unhealthy',
  hazardous: 'Hazardous',
};

/**
 * Single-reading modules.
 *
 * These are deliberately finer-grained than the composite panels: someone who only wants dew point
 * on their dashboard should be able to have exactly that, rather than the whole Comfort panel.
 * Every entry reads from the normalized `WeatherDashboardData` — never from an upstream response —
 * and returns null rather than inventing a value when the field is missing.
 */
export const METRIC_MODULES: MetricModuleDefinition[] = [
  {
    id: 'temperature',
    title: 'Temperature',
    description: 'The current reading.',
    read: (data, units) => {
      const current = data.current;
      if (!current) return null;
      return {
        value: formatTemperature(current.temperatureF, units),
        spoken: describeTemperature(current.temperatureF, units),
        detail: current.conditionLabel,
        qualifier: `High ${formatTemperature(current.highF, units)} · Low ${formatTemperature(current.lowF, units)}`,
      };
    },
  },
  {
    id: 'feels-like',
    title: 'Feels Like',
    description: 'Apparent temperature, accounting for wind and humidity.',
    read: (data, units) => {
      const current = data.current;
      if (!current) return null;
      const difference = Math.round(current.feelsLikeF - current.temperatureF);
      return {
        value: formatTemperature(current.feelsLikeF, units),
        spoken: describeTemperature(current.feelsLikeF, units),
        detail:
          difference === 0
            ? 'Same as the actual temperature'
            : `${Math.abs(difference)}° ${difference > 0 ? 'warmer' : 'cooler'} than the actual temperature`,
      };
    },
  },
  {
    id: 'precipitation-chance',
    title: 'Rain Chance',
    description: 'Likelihood of precipitation right now.',
    read: (data) => {
      const chance = data.current?.precipitationChance;
      if (chance == null) return null;
      return {
        value: formatPercent(chance),
        detail: chance >= 50 ? 'Rain is more likely than not' : 'Rain is unlikely',
      };
    },
  },
  {
    id: 'wind-speed',
    title: 'Wind',
    description: 'Current wind speed and direction.',
    read: (data, units) => {
      const current = data.current;
      if (!current) return null;
      return {
        value: formatSpeed(current.windMph, units),
        detail: `From the ${current.windDirection}`,
        qualifier: data.wind?.gustMph != null ? `Gusting ${formatSpeed(data.wind.gustMph, units)}` : undefined,
      };
    },
  },
  {
    id: 'humidity',
    title: 'Humidity',
    description: 'Relative humidity.',
    read: (data) => {
      const humidity = data.comfort?.humidityPercent;
      if (humidity == null) return null;
      return { value: formatPercent(humidity), detail: describeHumidity(humidity) };
    },
  },
  {
    id: 'dew-point',
    title: 'Dew Point',
    description: 'The temperature at which air becomes saturated.',
    read: (data, units) => {
      const dewPoint = data.comfort?.dewPointF;
      if (dewPoint == null) return null;
      return {
        value: formatTemperatureWithUnit(dewPoint, units),
        spoken: describeTemperature(dewPoint, units),
        detail: dewPoint >= 60 ? 'Muggy' : dewPoint >= 50 ? 'Noticeably humid' : 'Dry and comfortable',
      };
    },
  },
  {
    id: 'uv-index',
    title: 'UV Index',
    description: 'Current ultraviolet exposure.',
    read: (data) => {
      const uv = data.sun?.uvIndexNow ?? data.comfort?.uvIndex ?? null;
      if (uv == null) return null;
      return { value: formatIndex(uv), detail: describeUv(uv), qualifier: 'Out of 11+' };
    },
  },
  {
    id: 'pressure',
    title: 'Pressure',
    description: 'Barometric pressure at sea level.',
    read: (data, units) => {
      const pressure = data.atmospheric?.pressureInHg ?? data.comfort?.pressureInHg ?? null;
      if (pressure == null) return null;
      const trend = data.atmospheric?.pressureTrend;
      return {
        value: formatPressure(pressure, units),
        detail: trend ? `${trend.charAt(0).toUpperCase()}${trend.slice(1)}` : undefined,
      };
    },
  },
  {
    id: 'visibility',
    title: 'Visibility',
    description: 'How far you can see.',
    read: (data, units) => {
      const visibility = data.atmospheric?.visibilityMiles ?? data.comfort?.visibilityMiles ?? null;
      if (visibility == null) return null;
      return {
        value: formatDistance(visibility, units),
        detail: visibility >= 6 ? 'Clear' : visibility >= 3 ? 'Hazy' : 'Poor',
      };
    },
  },
  {
    id: 'cloud-cover',
    title: 'Cloud Cover',
    description: 'Portion of the sky covered by cloud.',
    read: (data) => {
      const cloud = data.atmospheric?.cloudCoverPercent;
      if (cloud == null) return null;
      return { value: formatPercent(cloud), detail: describeCloudCover(cloud) };
    },
  },
  {
    id: 'air-quality-index',
    title: 'Air Quality',
    description: 'US Air Quality Index.',
    read: (data) => {
      const aqi = data.airQuality?.usAqi ?? data.comfort?.airQualityIndex ?? null;
      if (aqi == null) return null;
      const category = data.airQuality?.category;
      return {
        value: formatIndex(aqi),
        detail: category ? AQI_CATEGORY_LABEL[category] : undefined,
        qualifier: 'US AQI',
      };
    },
  },
  {
    id: 'sunrise-sunset',
    title: 'Sun',
    description: 'Sunrise and sunset for this location.',
    read: (data) => {
      const sun = data.sun;
      if (!sun || (!sun.sunrise && !sun.sunset)) return null;
      const zone = data.location.timezone;
      const sunrise = formatTime(sun.sunrise, zone);
      const sunset = formatTime(sun.sunset, zone);
      return {
        value: sunrise === UNAVAILABLE ? UNAVAILABLE : sunrise,
        detail: `Sunset ${sunset}`,
        qualifier: 'Sunrise',
      };
    },
  },
];

export function getMetricModule(id: string): MetricModuleDefinition | undefined {
  return METRIC_MODULES.find((module) => module.id === id);
}
