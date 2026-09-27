import type { IconName } from '@/components/ui/icon';
import type { WeatherCondition } from './types';

/** The glyph for a condition. Decorative only — every caller also renders the condition's words. */
export function conditionIcon(condition: WeatherCondition, isDay = true): IconName {
  switch (condition) {
    case 'sunny':
      return isDay ? 'clear-day' : 'clear-night';
    case 'partly-cloudy':
      return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
    case 'cloudy':
      return 'cloud';
    case 'fog':
      return 'fog';
    case 'rain':
      return 'rain';
    case 'snow':
      return 'snow';
    case 'storm':
      return 'thunderstorm';
  }
}
