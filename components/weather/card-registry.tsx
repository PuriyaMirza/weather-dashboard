import type { ComponentType } from 'react';
import type { WeatherDashboardData } from '@/lib/weather/types';
import type { UnitSystem } from '@/lib/weather/units';
import { AirQualityCard } from './air-quality-card';
import { AtmosphericDetailsCard } from './atmospheric-details-card';
import { ComfortCard } from './comfort-card';
import { CurrentConditionsCard } from './current-conditions-card';
import { DailyForecastCard } from './daily-forecast-card';
import { HourlyTemperatureCard } from './hourly-temperature-card';
import { PrecipitationCard } from './precipitation-card';
import { SunUvCard } from './sun-uv-card';
import { WindCard } from './wind-card';

export type WeatherCardId =
  | 'current-conditions'
  | 'comfort'
  | 'hourly-temperature'
  | 'precipitation'
  | 'wind'
  | 'daily-forecast'
  | 'sun-uv'
  | 'atmospheric-details'
  | 'air-quality';

export interface WeatherCardProps {
  data?: WeatherDashboardData;
  isLoading?: boolean;
  errorMessage?: string;
  unitSystem: UnitSystem;
}

export interface WeatherCardDefinition {
  id: WeatherCardId;
  title: string;
  description: string;
  columnSpan: 'single' | 'wide';
  Component: ComponentType<WeatherCardProps>;
}

export const weatherCardRegistry: WeatherCardDefinition[] = [
  {
    id: 'current-conditions',
    title: 'Current Conditions',
    description: 'Snapshot of temperature, conditions, wind, and precipitation chance.',
    columnSpan: 'single',
    Component: CurrentConditionsCard,
  },
  {
    id: 'comfort',
    title: 'Comfort',
    description: 'Humidity, dew point, UV, visibility, pressure, and air quality.',
    columnSpan: 'single',
    Component: ComfortCard,
  },
  {
    id: 'hourly-temperature',
    title: 'Hourly Temperature',
    description: 'Temperature trend for the next several hours.',
    columnSpan: 'wide',
    Component: HourlyTemperatureCard,
  },
  {
    id: 'precipitation',
    title: 'Precipitation',
    description: 'Chance and amount of rain or snow over the coming hours.',
    columnSpan: 'wide',
    Component: PrecipitationCard,
  },
  {
    id: 'wind',
    title: 'Wind',
    description: 'Current speed, gusts, and direction.',
    columnSpan: 'single',
    Component: WindCard,
  },
  {
    id: 'daily-forecast',
    title: 'Daily Forecast',
    description: 'Highs, lows, and conditions for the week ahead.',
    columnSpan: 'wide',
    Component: DailyForecastCard,
  },
  {
    id: 'sun-uv',
    title: 'Sun and UV',
    description: 'Sunrise, sunset, daylight, and UV exposure.',
    columnSpan: 'single',
    Component: SunUvCard,
  },
  {
    id: 'air-quality',
    title: 'Air Quality',
    description: 'Current US AQI and the pollutants behind it.',
    columnSpan: 'single',
    Component: AirQualityCard,
  },
  {
    id: 'atmospheric-details',
    title: 'Atmospheric Details',
    description: 'Pressure, cloud cover, visibility, and humidity.',
    columnSpan: 'single',
    Component: AtmosphericDetailsCard,
  },
];

export function getCardDefinition(id: WeatherCardId): WeatherCardDefinition | undefined {
  return weatherCardRegistry.find((card) => card.id === id);
}
