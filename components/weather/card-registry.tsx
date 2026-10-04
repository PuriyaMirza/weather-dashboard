import type { ComponentType } from 'react';
import type { ActivityId } from '@/lib/weather/activity-windows';
import type { ForecastDayOption } from '@/lib/weather/forecast-day';
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
import { NextHoursCard } from './next-hours-card';
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
  | 'next-hours'
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
  /**
   * The activities this person said they care about. A preference passed down like `unitSystem`
   * above — modules still receive only `WeatherDashboardData` plus presentation choices, and still
   * never reach for the store or a request of their own.
   */
  activities?: ActivityId[];
  /**
   * The day the day picker has chosen, for modules whose definition sets `followsDay`; `data` is
   * then already scoped to it (see `scopeToDay`). Null or absent means the default view — the
   * rolling next 24 hours — so every other module, and every caller that predates the picker, sees
   * exactly what it always did. A presentation choice like `unitSystem`: the dashboard owns it and
   * modules still never reach for the store.
   */
  forecastDay?: ForecastDayOption | null;
  /** Arrange mode: turns each card's header icon into its own remove button. See card-frame.tsx. */
  isEditing?: boolean;
  onRemove?: () => void;
}

/** How a module presents in the menu's toggle list: a single reading, or a grouped panel. */
export type CardKind = 'reading' | 'panel';

export interface WeatherCardDefinition {
  id: WeatherCardId;
  title: string;
  description: string;
  kind: CardKind;
  /**
   * True for modules that describe a span of time — an hourly series, a total, a best window — and
   * so can be pointed at a later day by the day picker. Readings about *now* (current conditions,
   * a single humidity figure, air quality) never set it: "Saturday's humidity right now" has no
   * meaning, and re-labelling a current reading with a future day would be inventing data.
   */
  followsDay?: boolean;
  Component: ComponentType<WeatherCardProps>;
}

const compositeCards: WeatherCardDefinition[] = [
  {
    id: 'activity-windows',
    title: 'Best Time To Go Out',
    description: 'The best stretch of the next day for walking, running, cycling, and gardening.',
    kind: 'panel',
    followsDay: true,
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
    followsDay: true,
    Component: HourlyTemperatureCard,
  },
  {
    id: 'next-hours',
    title: 'Next Hours',
    description: 'Temperature and rain chance for the next several hours, hour by hour.',
    kind: 'panel',
    Component: NextHoursCard,
  },
  {
    id: 'precipitation',
    title: 'Precipitation',
    description: 'Chance and amount of rain or snow over the coming hours.',
    kind: 'panel',
    followsDay: true,
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
