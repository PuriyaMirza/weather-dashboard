import { describe, expect, it } from 'vitest';
import { compass, migrationOutlook, parkToday, prevailingDirection, seasonOf, toBirdingForecast } from '@/lib/forecast/birding-outlook';
import { forecastResponseSchema } from '@/lib/forecast/open-meteo';
import { forecastResponse } from './forecast-fixture';

describe('seasonOf', () => {
  it('knows spring and fall passage', () => {
    expect(seasonOf('2026-05-10')).toBe('spring');
    expect(seasonOf('2026-10-05')).toBe('fall');
    expect(seasonOf('2026-01-15')).toBe('off-season');
    expect(seasonOf('2026-07-04')).toBe('off-season');
  });
});

describe('wind direction helpers', () => {
  it('names compass points', () => {
    expect(compass(0)).toBe('N');
    expect(compass(225)).toBe('SW');
    expect(compass(350)).toBe('N');
  });

  it('averages directions across north correctly', () => {
    expect(prevailingDirection([{ mph: 10, deg: 350 }, { mph: 10, deg: 10 }])).toBe(0);
    expect(prevailingDirection([{ mph: 0, deg: 90 }])).toBeNull();
    expect(prevailingDirection([{ mph: null, deg: null }])).toBeNull();
  });
});

describe('migrationOutlook', () => {
  it('calls a dry southwesterly spring night good', () => {
    expect(migrationOutlook('2026-05-10', { windFromDeg: 220, windMph: 10, precipitationIn: 0 }).level).toBe('high');
  });

  it('calls a northwesterly fall night good and a southerly one low', () => {
    expect(migrationOutlook('2026-10-05', { windFromDeg: 315, windMph: 12, precipitationIn: 0 }).level).toBe('high');
    const low = migrationOutlook('2026-10-05', { windFromDeg: 180, windMph: 12, precipitationIn: 0 });
    expect(low.level).toBe('low');
    expect(low.reason).toContain('northerlies');
  });

  it('flags a fallout watch for a tailwind night with some rain, and low for a soaking', () => {
    expect(migrationOutlook('2026-05-10', { windFromDeg: 200, windMph: 10, precipitationIn: 0.1 }).level).toBe('fallout-watch');
    expect(migrationOutlook('2026-05-10', { windFromDeg: 200, windMph: 10, precipitationIn: 0.6 }).level).toBe('low');
  });

  it('treats calm nights as moderate and says when data is missing', () => {
    expect(migrationOutlook('2026-05-10', { windFromDeg: 0, windMph: 1, precipitationIn: 0 }).level).toBe('moderate');
    expect(migrationOutlook('2026-05-10', { windFromDeg: null, windMph: null, precipitationIn: null }).headline).toMatch(/unavailable/);
  });

  it('stays quiet outside migration season', () => {
    expect(migrationOutlook('2026-01-15', { windFromDeg: 315, windMph: 12, precipitationIn: 0 }).level).toBe('off-season');
  });
});

describe('toBirdingForecast', () => {
  const response = forecastResponse(['2026-10-04', '2026-10-05', '2026-10-06'], (date, h) =>
    date === '2026-10-04' && h >= 21 ? { windFrom: 320, windMph: 12 } : date === '2026-10-05' && h < 5 ? { windFrom: 330, windMph: 12 } : {},
  );

  it('matches the response schema it is built for', () => {
    expect(forecastResponseSchema.safeParse(response).success).toBe(true);
  });

  it('builds today and tomorrow from last night onward, skipping yesterday', () => {
    const forecast = toBirdingForecast(response, '2026-10-05T10:00:00Z', '2026-10-05');
    expect(forecast.days.map((d) => d.date)).toEqual(['2026-10-05', '2026-10-06']);
    const today = forecast.days[0];
    expect(compass(today.overnight.windFromDeg!)).toBe('NW');
    expect(today.outlook.level).toBe('high');
    expect(today.morning).toMatchObject({ sunrise: '2026-10-05T06:58', maxRainChance: 10, maxWindMph: 8 });
    expect(forecast.days[1].outlook.level).toBe('low');
  });

  it('omits a day whose overnight hours are missing rather than guessing', () => {
    const forecast = toBirdingForecast(forecastResponse(['2026-10-05']), 'x', '2026-10-05');
    expect(forecast.days).toEqual([]);
  });
});

describe('parkToday', () => {
  it('uses New York time, not the server clock', () => {
    expect(parkToday(new Date('2026-10-05T02:00:00Z'))).toBe('2026-10-04');
  });
});
