import type { ComponentType } from 'react';
import type { WeatherDashboardData } from '@/lib/weather/types';
import { ComfortCard } from './comfort-card';
import { CurrentConditionsCard } from './current-conditions-card';
import { HourlyTemperatureCard } from './hourly-temperature-card';

export type WeatherCardId = 'current-conditions' | 'comfort' | 'hourly-temperature';

export interface WeatherCardProps {
  data?: WeatherDashboardData;
  isLoading?: boolean;
  errorMessage?: string;
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
];
