export type UnitSystem = 'imperial' | 'metric';

/**
 * The internal model stores imperial values (see the `...F` / `...Mph` / `...Inches` field names),
 * because that is what the provider requests. Unit choice is therefore purely a presentation
 * concern: nothing re-fetches when the user switches, and there is only ever one canonical shape
 * of the data.
 */

const MM_PER_INCH = 25.4;
const KM_PER_MILE = 1.609344;
const HPA_PER_INHG = 33.863886667;

export function toCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function toKilometresPerHour(milesPerHour: number): number {
  return milesPerHour * KM_PER_MILE;
}

export function toMillimetres(inches: number): number {
  return inches * MM_PER_INCH;
}

export function toKilometres(miles: number): number {
  return miles * KM_PER_MILE;
}

export function toHectopascals(inchesOfMercury: number): number {
  return inchesOfMercury * HPA_PER_INHG;
}

/** Shown wherever a value is genuinely absent, so cards never render a fabricated zero. */
export const UNAVAILABLE = 'Unavailable';

function round(value: number, decimals = 0): string {
  return value.toFixed(decimals);
}

/** Temperature with a degree symbol, e.g. "72°" — the unit letter is usually implied by context. */
export function formatTemperature(fahrenheit: number | null | undefined, system: UnitSystem): string {
  if (fahrenheit == null) return UNAVAILABLE;
  const value = system === 'metric' ? toCelsius(fahrenheit) : fahrenheit;
  return `${round(value)}°`;
}

/** Temperature including the unit letter, e.g. "72°F", for standalone readings. */
export function formatTemperatureWithUnit(fahrenheit: number | null | undefined, system: UnitSystem): string {
  if (fahrenheit == null) return UNAVAILABLE;
  const value = system === 'metric' ? toCelsius(fahrenheit) : fahrenheit;
  return `${round(value)}°${system === 'metric' ? 'C' : 'F'}`;
}

/** Spoken form for screen readers, where "°" alone reads poorly. */
export function describeTemperature(fahrenheit: number | null | undefined, system: UnitSystem): string {
  if (fahrenheit == null) return UNAVAILABLE;
  const value = system === 'metric' ? toCelsius(fahrenheit) : fahrenheit;
  return `${round(value)} degrees ${system === 'metric' ? 'Celsius' : 'Fahrenheit'}`;
}

export function formatSpeed(milesPerHour: number | null | undefined, system: UnitSystem): string {
  if (milesPerHour == null) return UNAVAILABLE;
  return system === 'metric'
    ? `${round(toKilometresPerHour(milesPerHour))} km/h`
    : `${round(milesPerHour)} mph`;
}

export function formatPrecipitation(inches: number | null | undefined, system: UnitSystem): string {
  if (inches == null) return UNAVAILABLE;
  return system === 'metric' ? `${round(toMillimetres(inches), 1)} mm` : `${round(inches, 2)} in`;
}

export function formatDistance(miles: number | null | undefined, system: UnitSystem): string {
  if (miles == null) return UNAVAILABLE;
  return system === 'metric' ? `${round(toKilometres(miles), 1)} km` : `${round(miles, 1)} mi`;
}

export function formatPressure(inchesOfMercury: number | null | undefined, system: UnitSystem): string {
  if (inchesOfMercury == null) return UNAVAILABLE;
  return system === 'metric'
    ? `${round(toHectopascals(inchesOfMercury))} hPa`
    : `${round(inchesOfMercury, 2)} inHg`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return UNAVAILABLE;
  return `${Math.round(value)}%`;
}

export function formatIndex(value: number | null | undefined): string {
  if (value == null) return UNAVAILABLE;
  return round(value);
}

/**
 * Formats an offset-qualified ISO timestamp as a clock time, e.g. "3:15 PM".
 *
 * `timeZone` matters: without it the time renders in the *viewer's* zone, so looking up Tokyo
 * from London would show Tokyo's sunrise at a London hour. Passing the location's IANA zone shows
 * the time as someone standing there would read it.
 */
export function formatTime(isoTimestamp: string | null | undefined, timeZone?: string): string {
  if (!isoTimestamp) return UNAVAILABLE;
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return UNAVAILABLE;
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(date);
  } catch {
    // An unrecognised zone must not blank out the time.
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
  }
}

/** Hour-only label for chart axes and hourly rows, in the location's zone for the same reason. */
export function formatHour(isoTimestamp: string, timeZone?: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return UNAVAILABLE;
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(date);
  }
}

/** Formats a date as a short weekday, e.g. "Mon". */
export function formatWeekday(isoDate: string | null | undefined): string {
  if (!isoDate) return UNAVAILABLE;
  // Date-only strings parse as UTC; append a midday time so the weekday can't slip a day either way.
  const date = new Date(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate);
  if (Number.isNaN(date.getTime())) return UNAVAILABLE;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return UNAVAILABLE;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
