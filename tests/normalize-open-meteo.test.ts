import { describe, expect, it } from 'vitest';
import { openMeteoForecastResponseSchema } from '@/lib/weather/schemas';
import { normalizeOpenMeteoForecast } from '@/lib/weather/normalize-open-meteo';
import validResponse from './fixtures/open-meteo/valid-response.json';
import partialResponse from './fixtures/open-meteo/partial-response.json';

const PLACE = { name: 'Portland', region: 'Oregon', country: 'United States' };

function parse(fixture: unknown) {
  const result = openMeteoForecastResponseSchema.safeParse(fixture);
  if (!result.success) throw new Error(`fixture failed schema validation: ${result.error.message}`);
  return result.data;
}

describe('normalizeOpenMeteoForecast', () => {
  it('normalizes a valid response into the internal WeatherDashboardData model', () => {
    const data = normalizeOpenMeteoForecast(parse(validResponse), PLACE);

    expect(data.source).toBe('open-meteo');
    expect(data.location).toEqual({
      name: 'Portland',
      region: 'Oregon',
      country: 'United States',
      timezone: 'America/Los_Angeles',
      latitude: 45.5,
      longitude: -122.6784,
    });

    expect(data.current).not.toBeNull();
    expect(data.current?.temperatureF).toBe(72);
    expect(data.current?.feelsLikeF).toBe(74);
    expect(data.current?.highF).toBe(79);
    expect(data.current?.lowF).toBe(58);
    expect(data.current?.windMph).toBe(8);
    expect(data.current?.windDirection).toBe('NW');
    expect(data.current?.condition).toBe('partly-cloudy');
    expect(data.current?.conditionLabel).toBe('Partly cloudy');
    expect(data.current?.observedAt).toBe('2026-07-18T15:15:00-07:00');
    // current.time (15:15) is closest to hourly index 2 (15:00) -> precipitation_probability 12
    expect(data.current?.precipitationChance).toBe(12);

    expect(data.comfort).not.toBeNull();
    expect(data.comfort?.humidityPercent).toBe(54);
    expect(data.comfort?.dewPointF).toBe(55);
    expect(data.comfort?.uvIndex).toBe(6);
    expect(data.comfort?.visibilityMiles).toBeCloseTo(9.32, 1);
    expect(data.comfort?.pressureInHg).toBeCloseTo(30.08, 1);
    expect(data.comfort?.airQualityIndex).toBeNull();

    expect(data.hourly).toHaveLength(6);
    expect(data.hourly[0]).toMatchObject({
      time: '2026-07-18T13:00:00-07:00',
      temperatureF: 70,
      feelsLikeF: 71,
      precipitationChance: 10,
      condition: 'partly-cloudy',
    });
    expect(data.hourly[3].condition).toBe('sunny');

    expect(data.updatedAt).toBe('2026-07-18T15:15:00-07:00');
  });

  it('drops current conditions when a required current field is missing', () => {
    const response = parse(validResponse);
    response.current.weather_code = null;

    const data = normalizeOpenMeteoForecast(response, PLACE);
    expect(data.current).toBeNull();
  });

  it('drops comfort metrics entirely when pressure is missing, even though other fields are present', () => {
    const data = normalizeOpenMeteoForecast(parse(partialResponse), PLACE);
    expect(data.comfort).toBeNull();
    // Current conditions don't depend on pressure, so they should still be populated.
    expect(data.current).not.toBeNull();
    expect(data.current?.temperatureF).toBe(72);
  });

  it('skips individual hourly points that are missing required fields instead of fabricating values', () => {
    const data = normalizeOpenMeteoForecast(parse(partialResponse), PLACE);
    // Index 1 (14:00) has a null temperature_2m in the fixture and should be skipped.
    expect(data.hourly).toHaveLength(3);
    expect(data.hourly.map((point) => point.time)).toEqual([
      '2026-07-18T13:00:00-07:00',
      '2026-07-18T15:00:00-07:00',
      '2026-07-18T16:00:00-07:00',
    ]);
  });

  it('falls back to 0 precipitation chance when the matched hourly value is missing', () => {
    const response = parse(validResponse);
    response.hourly.precipitation_probability[2] = null;

    const data = normalizeOpenMeteoForecast(response, PLACE);
    expect(data.current?.precipitationChance).toBe(0);
  });
});

describe('normalizeOpenMeteoForecast — wind, sun, atmospheric, daily', () => {
  it('builds wind metrics including gusts and a compass direction', () => {
    const data = normalizeOpenMeteoForecast(parse(validResponse), PLACE);

    expect(data.wind).toEqual({
      speedMph: 8,
      gustMph: 14,
      directionDegrees: 315,
      direction: 'NW',
    });
  });

  it('drops wind entirely when speed is missing, but tolerates missing gusts', () => {
    const withoutSpeed = parse(validResponse);
    withoutSpeed.current.wind_speed_10m = null;
    expect(normalizeOpenMeteoForecast(withoutSpeed, PLACE).wind).toBeNull();

    const withoutGusts = parse(validResponse);
    withoutGusts.current.wind_gusts_10m = null;
    expect(normalizeOpenMeteoForecast(withoutGusts, PLACE).wind?.gustMph).toBeNull();
  });

  it('builds sun metrics with offset-qualified sunrise and sunset', () => {
    const data = normalizeOpenMeteoForecast(parse(validResponse), PLACE);

    expect(data.sun?.sunrise).toBe('2026-07-18T05:35:00-07:00');
    expect(data.sun?.sunset).toBe('2026-07-18T20:52:00-07:00');
    expect(data.sun?.daylightSeconds).toBe(55020);
    expect(data.sun?.uvIndexMax).toBe(7);
  });

  it('derives a rising pressure trend from the hourly series', () => {
    // The fixture's hourly pressure climbs steadily.
    const data = normalizeOpenMeteoForecast(parse(validResponse), PLACE);
    expect(data.atmospheric?.pressureTrend).toBe('rising');
  });

  it('reports a steady trend when the change is within the threshold', () => {
    const flat = parse(validResponse);
    flat.hourly.pressure_msl = flat.hourly.pressure_msl.map(() => 1018.5);

    expect(normalizeOpenMeteoForecast(flat, PLACE).atmospheric?.pressureTrend).toBe('steady');
  });

  it('reports a falling trend when pressure drops', () => {
    const falling = parse(validResponse);
    falling.hourly.pressure_msl = falling.hourly.pressure_msl.map((_, index) => 1020 - index);

    expect(normalizeOpenMeteoForecast(falling, PLACE).atmospheric?.pressureTrend).toBe('falling');
  });

  it('cannot derive a pressure trend from fewer than two readings', () => {
    const noPressure = parse(partialResponse);
    // The partial fixture has an all-null hourly pressure series.
    expect(normalizeOpenMeteoForecast(noPressure, PLACE).atmospheric?.pressureTrend).toBeNull();
  });

  it('builds one daily entry per day that has a high, low, and condition', () => {
    const data = normalizeOpenMeteoForecast(parse(validResponse), PLACE);

    expect(data.daily).toHaveLength(1);
    expect(data.daily[0]).toMatchObject({
      date: '2026-07-18',
      highF: 79,
      lowF: 58,
      condition: 'partly-cloudy',
      precipitationChance: 18,
      windMaxMph: 12,
    });
  });

  it('skips a day missing its high or condition rather than inventing one', () => {
    const response = parse(validResponse);
    response.daily.temperature_2m_max = [null];

    expect(normalizeOpenMeteoForecast(response, PLACE).daily).toHaveLength(0);
  });

  it('carries the new per-hour fields onto hourly points, nulling only what is missing', () => {
    const data = normalizeOpenMeteoForecast(parse(validResponse), PLACE);

    expect(data.hourly[0]).toMatchObject({
      precipitationInches: 0,
      windMph: 5,
      windGustMph: 9,
      windDirection: 'WNW',
      cloudCoverPercent: 20,
    });
  });

  it('keeps an hour whose optional fields are missing, nulling just those fields', () => {
    const data = normalizeOpenMeteoForecast(parse(partialResponse), PLACE);

    // The partial fixture nulls hourly wind speed at an index whose hour is otherwise complete,
    // so the hour survives with just that one field missing.
    const withoutWind = data.hourly.find((point) => point.windMph === null);
    expect(withoutWind).toBeDefined();
    expect(withoutWind?.temperatureF).toBeTypeOf('number');
  });
});
