import type { ComponentType } from 'react';
import { METRIC_MODULES, type MetricModuleId } from '@/lib/weather/metrics';
import type { WeatherDashboardData } from '@/lib/weather/types';
import type { UnitSystem } from '@/lib/weather/units';
import { ActivityWindowsCard } from './activity-windows-card';
import { AirQualityCard } from './air-quality-card';
import { AtmosphericDetailsCard } from './atmospheric-details-card';
import { ComfortCard } from './comfort-card';
import { CurrentConditionsCard } from './current-conditions-card';
import { DailyForecastCard } from './daily-forecast-card';
import { HourlyTemperatureCard } from './hourly-temperature-card';
import { PrecipitationCard } from './precipitation-card';
import { createStatModule } from './stat-module';
import { SunUvCard } from './sun-uv-card';
import { WindCard } from './wind-card';

/**
 * Panels that combine several readings, or render a chart or table. Distinct from the single
 * readings below, which are generated from `METRIC_MODULES`.
 */
export type CompositeCardId =
  | 'current-conditions'
  | 'comfort'
  | 'hourly-temperature'
  | 'precipitation'
  | 'wind'
  | 'daily-forecast'
  | 'sun-uv'
  | 'atmospheric-details'
  | 'air-quality'
  | 'activity-windows';

export type WeatherCardId = CompositeCardId | MetricModuleId;

export interface WeatherCardProps {
  data?: WeatherDashboardData;
  isLoading?: boolean;
  errorMessage?: string;
  unitSystem: UnitSystem;
}

/** How a module presents in the menu's toggle list: a single reading, or a grouped panel. */
export type CardKind = 'reading' | 'panel';

export interface WeatherCardDefinition {
  id: WeatherCardId;
  title: string;
  description: string;
  kind: CardKind;
  Component: ComponentType<WeatherCardProps>;
}

const compositeCards: WeatherCardDefinition[] = [
  {
    id: 'activity-windows',
    title: 'Best Time To Go Out',
    description: 'The best stretch of the next day for walking, running, cycling, and gardening.',
    kind: 'panel',
    Component: ActivityWindowsCard,
  },
  {
    id: 'current-conditions',
    title: 'Current Conditions',
    description: 'Snapshot of temperature, conditions, wind, and precipitation chance.',
    kind: 'panel',
    Component: CurrentConditionsCard,
  },
  {
    id: 'comfort',
    title: 'Comfort',
    description: 'Humidity, dew point, UV, visibility, pressure, and air quality.',
    kind: 'panel',
    Component: ComfortCard,
  },
  {
    id: 'hourly-temperature',
    title: 'Hourly Temperature',
    description: 'Temperature trend for the next several hours.',
    kind: 'panel',
    Component: HourlyTemperatureCard,
  },
  {
    id: 'precipitation',
    title: 'Precipitation',
    description: 'Chance and amount of rain or snow over the coming hours.',
    kind: 'panel',
    Component: PrecipitationCard,
  },
  {
    id: 'wind',
    title: 'Wind Detail',
    description: 'Current speed, gusts, and direction.',
    kind: 'panel',
    Component: WindCard,
  },
  {
    id: 'daily-forecast',
    title: 'Daily Forecast',
    description: 'Highs, lows, and conditions for the week ahead.',
    kind: 'panel',
    Component: DailyForecastCard,
  },
  {
    id: 'sun-uv',
    title: 'Sun and UV',
    description: 'Sunrise, sunset, daylight, and UV exposure.',
    kind: 'panel',
    Component: SunUvCard,
  },
  {
    id: 'air-quality',
    title: 'Air Quality Detail',
    description: 'Current US AQI and the pollutants behind it.',
    kind: 'panel',
    Component: AirQualityCard,
  },
  {
    id: 'atmospheric-details',
    title: 'Atmospheric Details',
    description: 'Pressure, cloud cover, visibility, and humidity.',
    kind: 'panel',
    Component: AtmosphericDetailsCard,
  },
];

/**
 * Single readings, generated from the metric table. They share one component, so a new reading is
 * a table entry in `lib/weather/metrics.ts` rather than a new file — and it automatically appears
 * in the menu's toggle list.
 */
const readingModules: WeatherCardDefinition[] = METRIC_MODULES.map((metric) => ({
  id: metric.id,
  title: metric.title,
  description: metric.description,
  kind: 'reading' as const,
  Component: createStatModule(metric),
}));

export const weatherCardRegistry: WeatherCardDefinition[] = [...readingModules, ...compositeCards];

export function getCardDefinition(id: WeatherCardId): WeatherCardDefinition | undefined {
  return weatherCardRegistry.find((card) => card.id === id);
}
