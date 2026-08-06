import type { WeatherCondition } from './types';

interface WeatherCodeInfo {
  condition: WeatherCondition;
  label: string;
}

// WMO weather interpretation codes (WMO Code Table 4677), as used by Open-Meteo.
// https://open-meteo.com/en/docs
const WMO_WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  0: { condition: 'sunny', label: 'Clear sky' },
  1: { condition: 'sunny', label: 'Mainly clear' },
  2: { condition: 'partly-cloudy', label: 'Partly cloudy' },
  3: { condition: 'cloudy', label: 'Overcast' },
  45: { condition: 'fog', label: 'Fog' },
  48: { condition: 'fog', label: 'Depositing rime fog' },
  51: { condition: 'rain', label: 'Light drizzle' },
  53: { condition: 'rain', label: 'Moderate drizzle' },
  55: { condition: 'rain', label: 'Dense drizzle' },
  56: { condition: 'rain', label: 'Light freezing drizzle' },
  57: { condition: 'rain', label: 'Dense freezing drizzle' },
  61: { condition: 'rain', label: 'Slight rain' },
  63: { condition: 'rain', label: 'Moderate rain' },
  65: { condition: 'rain', label: 'Heavy rain' },
  66: { condition: 'rain', label: 'Light freezing rain' },
  67: { condition: 'rain', label: 'Heavy freezing rain' },
  71: { condition: 'snow', label: 'Slight snow fall' },
  73: { condition: 'snow', label: 'Moderate snow fall' },
  75: { condition: 'snow', label: 'Heavy snow fall' },
  77: { condition: 'snow', label: 'Snow grains' },
  80: { condition: 'rain', label: 'Slight rain showers' },
  81: { condition: 'rain', label: 'Moderate rain showers' },
  82: { condition: 'rain', label: 'Violent rain showers' },
  85: { condition: 'snow', label: 'Slight snow showers' },
  86: { condition: 'snow', label: 'Heavy snow showers' },
  95: { condition: 'storm', label: 'Thunderstorm' },
  96: { condition: 'storm', label: 'Thunderstorm with slight hail' },
  99: { condition: 'storm', label: 'Thunderstorm with heavy hail' },
};

const UNKNOWN_WEATHER_CODE: WeatherCodeInfo = { condition: 'cloudy', label: 'Unknown' };

export function describeWeatherCode(code: number | null | undefined): WeatherCodeInfo {
  if (code == null) return UNKNOWN_WEATHER_CODE;
  return WMO_WEATHER_CODES[code] ?? UNKNOWN_WEATHER_CODE;
}
