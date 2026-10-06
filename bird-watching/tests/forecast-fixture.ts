import type { ForecastResponse } from '@/lib/forecast/open-meteo';

/**
 * A synthetic Open-Meteo response in the real shape (hourly parallel arrays + daily sunrise and
 * sunset), so tests can set the overnight wind they need. Not a recording.
 */
export function forecastResponse(
  dates: string[],
  hour: (date: string, h: number) => { windFrom?: number; windMph?: number; rainIn?: number } = () => ({}),
): ForecastResponse {
  const time: string[] = [];
  const t: number[] = [];
  const pp: number[] = [];
  const p: number[] = [];
  const ws: number[] = [];
  const wd: number[] = [];
  const cc: number[] = [];
  for (const date of dates) {
    for (let h = 0; h < 24; h++) {
      const v = hour(date, h);
      time.push(`${date}T${String(h).padStart(2, '0')}:00`);
      t.push(50 + h / 2);
      pp.push(10);
      p.push(v.rainIn ?? 0);
      ws.push(v.windMph ?? 8);
      wd.push(v.windFrom ?? 200);
      cc.push(40);
    }
  }
  return {
    timezone: 'America/New_York',
    hourly: { time, temperature_2m: t, precipitation_probability: pp, precipitation: p, wind_speed_10m: ws, wind_direction_10m: wd, cloud_cover: cc },
    daily: { time: dates, sunrise: dates.map((d) => `${d}T06:58`), sunset: dates.map((d) => `${d}T18:31`) },
  };
}
