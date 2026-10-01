import type { IconName } from '@/components/ui/icon';
import { AQI_CATEGORY_LABEL } from '@/lib/weather/metrics';
import type { AirQualityCategory, WeatherDashboardData } from '@/lib/weather/types';
import {
  describeTemperature,
  formatDistance,
  formatIndex,
  formatPercent,
  formatPressure,
  formatSpeed,
  formatTemperature,
  UNAVAILABLE,
  type UnitSystem,
} from '@/lib/weather/units';

/** Stands in for any missing reading — a dash, never a fabricated number. */
export const MISSING = '—';

/** The most readings the hero has room for: four across a phone-width card is already tight. */
export const MAX_FAVORITE_METRICS = 4;

export const FAVORITE_METRIC_IDS = [
  'range',
  'feels',
  'dew',
  'pressure',
  'humidity',
  'wind',
  'uv',
  'visibility',
  'cloud-cover',
  'air-quality',
] as const;

export type FavoriteMetricId = (typeof FAVORITE_METRIC_IDS)[number];

/** What a fresh install shows — the four readings the Right Now card carried before this was a choice. */
export const DEFAULT_FAVORITE_METRICS: FavoriteMetricId[] = ['range', 'feels', 'dew', 'pressure'];

export interface FavoriteMetricReading {
  value: string;
  /** Printed small under the value ("mph", "Moderate"); never the only carrier of the reading. */
  unit?: string;
  /** Spoken form of the whole reading where the visible one is terse or truncated. */
  spoken?: string;
}

export interface FavoriteMetricDefinition {
  id: FavoriteMetricId;
  /** Terse label for the hero tile. */
  label: string;
  /** Full name, used in the pickers and as the spoken label. */
  title: string;
  icon: IconName;
  read: (data: WeatherDashboardData, unitSystem: UnitSystem) => FavoriteMetricReading;
}

/** "30.08 inHg" → { value: "30.08", unit: "inHg" }; a lone dash or "Unavailable" stays whole. */
function split(formatted: string): FavoriteMetricReading {
  if (formatted === UNAVAILABLE) return { value: MISSING };
  const space = formatted.lastIndexOf(' ');
  return space < 0 ? { value: formatted } : { value: formatted.slice(0, space), unit: formatted.slice(space + 1) };
}

function temperature(fahrenheit: number | null | undefined, unitSystem: UnitSystem): string {
  return fahrenheit == null ? MISSING : formatTemperature(fahrenheit, unitSystem);
}

function plain(formatted: string): FavoriteMetricReading {
  return { value: formatted === UNAVAILABLE ? MISSING : formatted };
}

/** Short enough for a quarter of a phone-width strip; the full category is spoken. */
const AQI_SHORT_LABEL: Record<AirQualityCategory, string> = {
  good: 'Good',
  moderate: 'Moderate',
  sensitive: 'Sensitive',
  unhealthy: 'Unhealthy',
  'very-unhealthy': 'Very unhealthy',
  hazardous: 'Hazardous',
};

/**
 * Every reading a user can pin to the hero. Each reads only `WeatherDashboardData`, preferring the
 * same fields the grid's modules read so the hero and a module never disagree on screen.
 */
export const FAVORITE_METRICS: FavoriteMetricDefinition[] = [
  {
    id: 'range',
    label: 'Range',
    title: 'High and low',
    icon: 'thermostat',
    read: ({ current }, unitSystem) => ({
      value: `${temperature(current?.highF, unitSystem)} / ${temperature(current?.lowF, unitSystem)}`,
    }),
  },
  {
    id: 'feels',
    label: 'Feels',
    title: 'Feels like',
    icon: 'feels-like',
    read: ({ current }, unitSystem) => ({
      value: temperature(current?.feelsLikeF, unitSystem),
      spoken: current ? describeTemperature(current.feelsLikeF, unitSystem) : undefined,
    }),
  },
  {
    id: 'dew',
    label: 'Dew',
    title: 'Dew point',
    icon: 'dew-point',
    read: (data, unitSystem) => ({
      value: temperature(data.atmospheric?.dewPointF ?? data.comfort?.dewPointF, unitSystem),
    }),
  },
  {
    id: 'pressure',
    label: 'Barom.',
    title: 'Pressure',
    icon: 'pressure',
    read: (data, unitSystem) =>
      split(formatPressure(data.atmospheric?.pressureInHg ?? data.comfort?.pressureInHg, unitSystem)),
  },
  {
    id: 'humidity',
    label: 'Humidity',
    title: 'Humidity',
    icon: 'humidity',
    read: (data) => plain(formatPercent(data.atmospheric?.humidityPercent ?? data.comfort?.humidityPercent)),
  },
  {
    id: 'wind',
    label: 'Wind',
    title: 'Wind speed',
    icon: 'air',
    read: (data, unitSystem) =>
      split(formatSpeed(data.wind?.speedMph ?? data.current?.windMph, unitSystem)),
  },
  {
    id: 'uv',
    label: 'UV',
    title: 'UV index',
    icon: 'uv',
    read: (data) => plain(formatIndex(data.sun?.uvIndexNow ?? data.comfort?.uvIndex)),
  },
  {
    id: 'visibility',
    label: 'Visibility',
    title: 'Visibility',
    icon: 'visibility',
    read: (data, unitSystem) =>
      split(formatDistance(data.atmospheric?.visibilityMiles ?? data.comfort?.visibilityMiles, unitSystem)),
  },
  {
    id: 'cloud-cover',
    label: 'Clouds',
    title: 'Cloud cover',
    icon: 'cloud-cover',
    read: (data) => plain(formatPercent(data.atmospheric?.cloudCoverPercent)),
  },
  {
    id: 'air-quality',
    label: 'Air',
    title: 'Air quality',
    icon: 'air',
    read: (data) => {
      const airQuality = data.airQuality;
      if (airQuality?.usAqi == null) return { value: MISSING };
      const category = airQuality.category;
      return {
        value: String(Math.round(airQuality.usAqi)),
        // The word rides with the number: an AQI is meaningless to most people without it, and
        // severity must never be carried by position or colour alone.
        unit: category ? AQI_SHORT_LABEL[category] : 'US AQI',
        spoken: `US AQI ${Math.round(airQuality.usAqi)}${category ? `, ${AQI_CATEGORY_LABEL[category]}` : ''}`,
      };
    },
  },
];

export function isFavoriteMetricId(value: unknown): value is FavoriteMetricId {
  return typeof value === 'string' && (FAVORITE_METRIC_IDS as readonly string[]).includes(value);
}

export function getFavoriteMetric(id: FavoriteMetricId): FavoriteMetricDefinition {
  return FAVORITE_METRICS.find((metric) => metric.id === id) ?? FAVORITE_METRICS[0];
}

/**
 * Coerces anything claiming to be a favourites list into one the hero can render: known ids only,
 * no repeats, at most four, in the order given. Empty or non-array input falls back to the defaults
 * rather than leaving the hero's reading row blank.
 */
export function normalizeFavoriteMetrics(raw: unknown): FavoriteMetricId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_FAVORITE_METRICS];
  const valid = [...new Set(raw.filter(isFavoriteMetricId))].slice(0, MAX_FAVORITE_METRICS);
  return valid.length > 0 ? valid : [...DEFAULT_FAVORITE_METRICS];
}
