import type { ForecastResponse } from './open-meteo';

/*
  A birder's reading of the weather. The migration outlook is a rule of thumb, not a radar
  forecast: songbirds migrate at night and ride tailwinds — southerlies in spring, northerlies
  behind a cold front in fall — and rain overnight can force them down at dawn ("fallout").
  The UI says so in words and links to BirdCast for the real radar-based forecast.
*/

export type Season = 'spring' | 'fall' | 'off-season';
export type OutlookLevel = 'high' | 'moderate' | 'low' | 'fallout-watch' | 'off-season';

export interface MigrationOutlook {
  level: OutlookLevel;
  headline: string;
  reason: string;
}

export interface Overnight {
  /** Direction the wind blew from, degrees; null when calm or unknown. */
  windFromDeg: number | null;
  windMph: number | null;
  precipitationIn: number | null;
}

export interface MorningConditions {
  /** Local "YYYY-MM-DDTHH:mm". */
  sunrise: string;
  sunset: string;
  tempLowF: number | null;
  tempHighF: number | null;
  maxRainChance: number | null;
  maxWindMph: number | null;
  windFromDeg: number | null;
  avgCloudCover: number | null;
}

export interface BirdingDay {
  date: string;
  morning: MorningConditions;
  overnight: Overnight;
  outlook: MigrationOutlook;
}

export interface BirdingForecast {
  fetchedAt: string;
  days: BirdingDay[];
}

/** Spring and fall passage as seen in Central Park; the edges are soft, the cores are not. */
export function seasonOf(date: string): Season {
  const [, month, day] = date.split('-').map(Number);
  const md = month * 100 + day;
  if (md >= 315 && md <= 610) return 'spring';
  if (md >= 801 && md <= 1120) return 'fall';
  return 'off-season';
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function compass(deg: number): (typeof COMPASS)[number] {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** Tailwind for northbound (spring) birds: wind from the south-east round to the west. */
function favorsSpring(deg: number) {
  return deg >= 135 && deg <= 270;
}

/** Tailwind for southbound (fall) birds: wind from the north-west round to the north-east. */
function favorsFall(deg: number) {
  return deg >= 280 || deg <= 45;
}

const CALM_MPH = 3;
// Below this a "tailwind" barely helps; migrants still fly, but in modest numbers.
const STRONG_TAILWIND_MPH = 5;
const SOAKING_IN = 0.25;

export function migrationOutlook(date: string, overnight: Overnight): MigrationOutlook {
  const season = seasonOf(date);
  if (season === 'off-season')
    return {
      level: 'off-season',
      headline: 'Outside migration season',
      reason: 'Few birds are on the move now. Expect the residents and, in winter, ducks on the Reservoir.',
    };
  const { windFromDeg, windMph, precipitationIn } = overnight;
  if (windFromDeg === null || windMph === null)
    return { level: 'moderate', headline: 'Migration outlook unavailable', reason: 'Overnight wind data is missing, so there is no call to make.' };

  const direction = compass(windFromDeg);
  const tailwind = season === 'spring' ? favorsSpring(windFromDeg) : favorsFall(windFromDeg);
  const rain = precipitationIn ?? 0;
  const wanted = season === 'spring' ? 'southerly' : 'northerly';

  if (tailwind && rain > 0.02 && rain < SOAKING_IN)
    return {
      level: 'fallout-watch',
      headline: 'Fallout watch',
      reason: `Overnight ${direction} winds favored migrants, and rain may have forced them down. Get to the Ramble early.`,
    };
  if (rain >= SOAKING_IN)
    return { level: 'low', headline: 'Low migration', reason: 'Steady rain overnight kept most birds grounded wherever they were.' };
  if (windMph < CALM_MPH)
    return { level: 'moderate', headline: 'Moderate migration', reason: 'Calm overnight air lets some birds move even without a tailwind.' };
  if (tailwind && windMph < STRONG_TAILWIND_MPH)
    return {
      level: 'moderate',
      headline: 'Moderate migration',
      reason: `Overnight ${direction} winds were in the right direction for ${season} migrants, but light (${Math.round(windMph)} mph).`,
    };
  if (tailwind)
    return {
      level: 'high',
      headline: 'Good migration night',
      reason: `Dry overnight ${direction} winds at ${Math.round(windMph)} mph gave ${season} migrants the ${wanted} tailwind they wait for.`,
    };
  return {
    level: 'low',
    headline: 'Low migration',
    reason: `Overnight ${direction} winds were against ${season} migrants, who need ${season === 'spring' ? 'southerlies' : 'northerlies'}. Expect mostly the birds already here.`,
  };
}

interface Hour {
  time: string;
  tempF: number | null;
  rainChance: number | null;
  precipitationIn: number | null;
  windMph: number | null;
  windFromDeg: number | null;
  cloudCover: number | null;
}

function hours(response: ForecastResponse): Hour[] {
  const h = response.hourly;
  return h.time.map((time, i) => ({
    time,
    tempF: h.temperature_2m[i] ?? null,
    rainChance: h.precipitation_probability[i] ?? null,
    precipitationIn: h.precipitation[i] ?? null,
    windMph: h.wind_speed_10m[i] ?? null,
    windFromDeg: h.wind_direction_10m[i] ?? null,
    cloudCover: h.cloud_cover[i] ?? null,
  }));
}

const known = (values: (number | null)[]) => values.filter((v): v is number => v !== null);
const max = (values: (number | null)[]) => (known(values).length ? Math.max(...known(values)) : null);
const min = (values: (number | null)[]) => (known(values).length ? Math.min(...known(values)) : null);
const sum = (values: (number | null)[]) => (known(values).length ? known(values).reduce((a, b) => a + b, 0) : null);
const mean = (values: (number | null)[]) => (known(values).length ? sum(values)! / known(values).length : null);

/** Speed-weighted mean wind direction; a plain average of angles breaks across north (350° + 10°). */
export function prevailingDirection(samples: { mph: number | null; deg: number | null }[]): number | null {
  let u = 0;
  let v = 0;
  for (const { mph, deg } of samples) {
    if (mph === null || deg === null) continue;
    u += mph * Math.sin((deg * Math.PI) / 180);
    v += mph * Math.cos((deg * Math.PI) / 180);
  }
  if (u === 0 && v === 0) return null;
  return Math.round(((Math.atan2(u, v) * 180) / Math.PI + 360) % 360);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Builds the morning-by-morning view. A day appears only when its whole overnight (9 pm to
 * 5 am) and morning (sunrise to 4 hours after) are in the response — no partial guesses.
 */
export function toBirdingForecast(response: ForecastResponse, fetchedAt: string, today: string): BirdingForecast {
  const all = hours(response);
  const between = (from: string, to: string) => all.filter((h) => h.time >= from && h.time < to);
  const days: BirdingDay[] = [];

  response.daily.time.forEach((date, i) => {
    if (date < today) return;
    const sunrise = response.daily.sunrise[i];
    const sunset = response.daily.sunset[i];
    const night = between(`${shiftDate(date, -1)}T21:00`, `${date}T05:00`);
    const sunriseHour = `${sunrise.slice(0, 13)}:00`;
    const endHour = `${date}T${String(Number(sunrise.slice(11, 13)) + 4).padStart(2, '0')}:00`;
    const morning = between(sunriseHour, endHour);
    if (night.length < 8 || morning.length < 4) return;

    const overnight: Overnight = {
      windFromDeg: prevailingDirection(night.map((h) => ({ mph: h.windMph, deg: h.windFromDeg }))),
      windMph: mean(night.map((h) => h.windMph)),
      precipitationIn: sum(night.map((h) => h.precipitationIn)),
    };
    days.push({
      date,
      overnight,
      outlook: migrationOutlook(date, overnight),
      morning: {
        sunrise,
        sunset,
        tempLowF: min(morning.map((h) => h.tempF)),
        tempHighF: max(morning.map((h) => h.tempF)),
        maxRainChance: max(morning.map((h) => h.rainChance)),
        maxWindMph: max(morning.map((h) => h.windMph)),
        windFromDeg: prevailingDirection(morning.map((h) => ({ mph: h.windMph, deg: h.windFromDeg }))),
        avgCloudCover: mean(morning.map((h) => h.cloudCover)),
      },
    });
  });
  return { fetchedAt, days };
}

/** "YYYY-MM-DD" for now in New York, whatever timezone the server runs in. */
export function parkToday(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
