import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBriefing } from '@/lib/weather/briefing';
import { listForecastDays, scopeToDay, type ForecastDayOption } from '@/lib/weather/forecast-day';
import { mockWeatherData, mockWeekWeatherData } from '@/lib/weather/mock-data';
import type { DailyForecastDay, HourlyPoint, WeatherDashboardData } from '@/lib/weather/types';
import type { UnitSystem } from '@/lib/weather/units';

const MS_PER_HOUR = 60 * 60 * 1000;
/** Portland in July, matching the fixture's timezone. */
const OFFSET_HOURS = -7;

/** A calm, dry, mild hour, so each test changes only the reading it is about. */
function hour(time: string, overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time,
    temperatureF: 60,
    feelsLikeF: 60,
    precipitationChance: 0,
    condition: 'cloudy',
    precipitationInches: 0,
    windMph: 5,
    windGustMph: 8,
    windDirection: 'W',
    cloudCoverPercent: 50,
    pressureInHg: 30,
    uvIndex: 1,
    ...overrides,
  };
}

/**
 * `count` consecutive hours from a local start ("2026-07-18T09"), offset-qualified the way the
 * normalizer delivers them; `shape` overrides each hour by its index.
 */
function hoursFrom(start: string, count: number, shape: (index: number) => Partial<HourlyPoint> = () => ({})) {
  const startMs = Date.parse(`${start}:00:00-07:00`);
  return Array.from({ length: count }, (_, index) => {
    // Shifted so the UTC fields read as the location's wall clock.
    const local = new Date(startMs + (index + OFFSET_HOURS) * MS_PER_HOUR);
    return hour(`${local.toISOString().slice(0, 13)}:00:00-07:00`, shape(index));
  });
}

/** Today's rolling view: `hourly` starts at the current hour. */
function todayWith(hourly: HourlyPoint[], overrides: Partial<WeatherDashboardData> = {}): WeatherDashboardData {
  return { ...mockWeekWeatherData, hourly, forecastHours: hourly, ...overrides };
}

function day(date: string, overrides: Partial<DailyForecastDay> = {}): DailyForecastDay {
  return {
    date,
    condition: 'cloudy',
    conditionLabel: 'Cloudy',
    highF: 70,
    lowF: 55,
    precipitationChance: 10,
    precipitationInches: 0,
    windMaxMph: 10,
    sunrise: null,
    sunset: null,
    uvIndexMax: null,
    ...overrides,
  };
}

/** Saturday 2026-07-18 is today in every fixture here. */
const MONDAY: ForecastDayOption = { date: '2026-07-20', label: 'Mon', isToday: false };

function brief(data: WeatherDashboardData, unitSystem: UnitSystem = 'imperial', forecastDay?: ForecastDayOption) {
  return buildBriefing(data, { unitSystem, forecastDay });
}

/** A later day, scoped the way the dashboard scopes it, with the option the picker would pass. */
function onDay(data: WeatherDashboardData, date: string, unitSystem: UnitSystem = 'imperial') {
  const option = listForecastDays(data).find((candidate) => candidate.date === date);
  if (!option) throw new Error(`No forecast day ${date}`);
  return brief(scopeToDay(data, date), unitSystem, option);
}

/** A later day built by hand: its own hours, the fixture's week of daily rows. */
function laterDayWith(hourly: HourlyPoint[], forecastDay: ForecastDayOption = MONDAY, unitSystem: UnitSystem = 'imperial') {
  return brief({ ...mockWeekWeatherData, hourly }, unitSystem, forecastDay);
}

const rainFrom = (from: number, to: number, condition: HourlyPoint['condition'] = 'rain') => (index: number) =>
  index >= from && index < to ? { precipitationChance: 70, condition } : {};

describe('buildBriefing — precipitation timing', () => {
  it('gives the start and the hour it eases', () => {
    // 9 AM start; indices 6-8 are 3, 4 and 5 PM, so it eases at 6.
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, rainFrom(6, 9))));
    expect(sentences[0]).toBe('Rain likely from about 3 PM until 6 PM.');
  });

  it('says snow when the hours report snow', () => {
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, rainFrom(6, 9, 'snow'))));
    expect(sentences[0]).toBe('Snow likely from about 3 PM until 6 PM.');
  });

  it('says storms when any hour of the stretch is a storm', () => {
    const shape = (index: number) =>
      index === 7 ? { precipitationChance: 80, condition: 'storm' as const } : rainFrom(6, 9)(index);
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, shape)))[0]).toBe('Storms likely from about 3 PM until 6 PM.');
  });

  it('calls a likely chance under a non-precipitating condition rain, rather than inventing snow', () => {
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, rainFrom(6, 9, 'cloudy'))));
    expect(sentences[0]).toBe('Rain likely from about 3 PM until 6 PM.');
  });

  it('says it is raining now, and when it eases, when the current hour already qualifies', () => {
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, rainFrom(0, 3))));
    expect(sentences[0]).toBe('Rain now, easing around 12 PM.');
  });

  it('says rain now continues when it never eases within the series', () => {
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, rainFrom(0, 24))));
    expect(sentences[0]).toBe('Rain now, and likely through the next 24 hours.');
  });

  it('says a stretch that reaches the end of today’s window lasts into tomorrow', () => {
    // From 9 PM to the window's last hour, 8 AM tomorrow: the end is unknown, so none is given.
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, rainFrom(12, 24))));
    expect(sentences[0]).toBe('Rain likely from about 9 PM, lasting into tomorrow.');
  });

  it('says a stretch that reaches the end of a later day lasts into the night', () => {
    const sentences = laterDayWith(hoursFrom('2026-07-20T00', 24, rainFrom(15, 24)));
    expect(sentences[0]).toBe('Rain likely from about 3 PM, lasting into the night.');
  });

  it('says rain is likely all day on a later day that is wet throughout', () => {
    // Monday in the fixture rains at 65% every hour.
    expect(onDay(mockWeekWeatherData, '2026-07-20')[0]).toBe('Rain likely all day.');
  });

  it('says until when on a later day that starts wet', () => {
    expect(laterDayWith(hoursFrom('2026-07-20T00', 24, rainFrom(0, 9)))[0]).toBe('Rain likely until about 9 AM.');
  });

  it('marks hours past midnight as tomorrow in today’s view, once', () => {
    // 4 PM start; indices 10-13 are 2-5 AM, easing at 6 AM the same night.
    const sentences = brief(todayWith(hoursFrom('2026-07-18T16', 24, rainFrom(10, 14))));
    expect(sentences[0]).toBe('Rain likely from about 2 AM tomorrow until 6 AM.');
  });

  it('marks an end time tomorrow when the stretch crosses midnight', () => {
    // 4 PM start; indices 5-9 are 9 PM to 1 AM, easing at 2 AM.
    const sentences = brief(todayWith(hoursFrom('2026-07-18T16', 24, rainFrom(5, 10))));
    expect(sentences[0]).toBe('Rain likely from about 9 PM until 2 AM tomorrow.');
  });

  it('gives no end time when a missing hour interrupts the stretch, rather than guessing one', () => {
    const hours = hoursFrom('2026-07-18T09', 24, rainFrom(6, 9));
    // Drop 6 PM, the hour that would have said it eased.
    const gapped = hours.filter((_, index) => index !== 9);
    expect(brief(todayWith(gapped))[0]).toBe('Rain likely from about 3 PM.');
  });

  it('says dry for the next 24 hours today, and dry all day on a later day', () => {
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24)))[0]).toBe('Dry for the next 24 hours.');
    // Sunday in the fixture peaks at 3%.
    expect(onDay(mockWeekWeatherData, '2026-07-19')[0]).toBe('Dry all day.');
  });

  it('never claims a full day of dry weather from a shorter series', () => {
    // mockWeatherData carries eight hours, peaking at 18%.
    expect(brief(mockWeatherData)[0]).toBe('Dry for the next 8 hours.');
  });

  it('describes a chance that never reaches likely by its peak', () => {
    const slight = (index: number) => (index === 7 ? { precipitationChance: 30, condition: 'rain' as const } : {});
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, slight)))[0]).toBe(
      'A slight chance of rain, peaking at 30% around 4 PM.',
    );

    const moderate = (index: number) => (index === 7 ? { precipitationChance: 45, condition: 'snow' as const } : {});
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, moderate)))[0]).toBe(
      'A chance of snow, peaking at 45% around 4 PM.',
    );
  });
});

describe('buildBriefing — temperature', () => {
  /** 60° at 9 AM, rising a degree an hour to 72° at 9 PM, then falling. */
  const warmingDay = (index: number) => ({ temperatureF: index <= 12 ? 60 + index : 72 - (index - 12) });

  it('says how warm it gets and by when, over the next twelve hours', () => {
    const peaked = (index: number) => ({ temperatureF: [60, 63, 66, 68, 70, 71, 72, 71, 69, 66, 64, 62, 61][index] ?? 58 });
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, peaked))).find((s) => s.startsWith('Warming'))).toBe(
      'Warming to 72° by 3 PM.',
    );
  });

  it('says how cool it gets and by when', () => {
    // From 70° at 3 PM down to 45° at 11 PM.
    const evening = (index: number) => ({ temperatureF: index === 8 ? 45 : index < 8 ? 70 - index * 3 : 50 });
    expect(brief(todayWith(hoursFrom('2026-07-18T15', 24, evening)))).toContain('Cooling to 45° by 11 PM.');
  });

  it('says nothing about a swing under the threshold', () => {
    const flat = (index: number) => ({ temperatureF: 60 + (index % 3) });
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, flat)));
    expect(sentences.some((s) => /warming|cooling/i.test(s))).toBe(false);
  });

  it('goes with the larger change when it warms a little before falling a lot', () => {
    const front = (index: number) => ({ temperatureF: index === 1 ? 64 : index === 0 ? 60 : 45 });
    expect(brief(todayWith(hoursFrom('2026-07-18T12', 24, front)))).toContain('Cooling to 45° by 2 PM.');
  });

  it('looks no further than twelve hours ahead', () => {
    // Steady until a 90° reading thirteen hours out, which is tomorrow's business.
    const late = (index: number) => ({ temperatureF: index === 13 ? 90 : 60 });
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, late)));
    expect(sentences.some((s) => /warming/i.test(s))).toBe(false);
  });

  it('marks a turning point past midnight as tomorrow', () => {
    const overnight = (index: number) => ({ temperatureF: 70 - Math.min(index, 8) * 2 });
    // 9 PM start, coolest from 5 AM on.
    expect(brief(todayWith(hoursFrom('2026-07-18T21', 24, overnight)))).toContain('Cooling to 54° by 5 AM tomorrow.');
  });

  it('gives a later day its high, when it peaks, and its low', () => {
    // Sunday in the fixture runs 60° to 83°, warmest at 3 PM.
    expect(onDay(mockWeekWeatherData, '2026-07-19')).toContain('High of 83° around 3 PM, low of 60°.');
  });

  it('says a later day with no swing at all stays around one temperature', () => {
    expect(laterDayWith(hoursFrom('2026-07-20T00', 24))).toContain('Around 60° all day.');
  });

  it('prints temperatures in the chosen unit', () => {
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, warmingDay)), 'metric');
    // 72°F is 22°C.
    expect(sentences).toContain('Warming to 22° by 9 PM.');
  });

  it('leaves the sentence out when there is no hour ahead to compare against', () => {
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 1)));
    expect(sentences.some((s) => /warming|cooling/i.test(s))).toBe(false);
  });
});

describe('buildBriefing — wind', () => {
  it('warns about gusts from the hour they start, up to the strongest', () => {
    const gusty = (index: number) => (index >= 5 ? { windGustMph: index === 8 ? 35 : 31 } : {});
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, gusty)))).toContain('Gusty from 2 PM, up to 35 mph.');
  });

  it('prints wind speed in the chosen unit', () => {
    const gusty = (index: number) => (index >= 5 ? { windGustMph: 35 } : {});
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, gusty)), 'metric')).toContain('Gusty from 2 PM, up to 56 km/h.');
  });

  it('calls strong sustained wind windy when the gusts stay under their own line', () => {
    const windy = (index: number) => (index >= 5 ? { windMph: 22, windGustMph: null } : {});
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, windy)))).toContain('Windy from 2 PM, up to 22 mph.');
  });

  it('says gusty now when the current hour is already gusty', () => {
    const gusty = () => ({ windGustMph: 32 });
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, gusty)))).toContain('Gusty now, up to 32 mph.');
  });

  it('says nothing when the wind stays under both lines', () => {
    const breezy = () => ({ windMph: 19, windGustMph: 29 });
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, breezy)));
    expect(sentences.some((s) => /gusty|windy/i.test(s))).toBe(false);
  });

  it('says nothing when the wind fields are missing, rather than calling it calm or windy', () => {
    const unknown = () => ({ windMph: null, windGustMph: null });
    const sentences = brief(todayWith(hoursFrom('2026-07-18T09', 24, unknown)));
    expect(sentences.some((s) => /gusty|windy|calm/i.test(s))).toBe(false);
  });
});

describe('buildBriefing — comparison', () => {
  const steady = hoursFrom('2026-07-18T09', 24);

  it('compares tomorrow’s high with today’s', () => {
    // The fixture's Sunday high is 83° against Saturday's 79°.
    expect(brief(todayWith(steady)).at(-1)).toBe('Tomorrow: 4° warmer.');
  });

  it('adds rain when tomorrow is likely to be wet', () => {
    const daily = [day('2026-07-18', { highF: 79 }), day('2026-07-19', { highF: 71, precipitationChance: 62, condition: 'rain' })];
    expect(brief(todayWith(steady, { daily })).at(-1)).toBe('Tomorrow: 8° cooler, rain likely.');
  });

  it('says snow when tomorrow’s condition is snow', () => {
    const daily = [day('2026-07-18', { highF: 30 }), day('2026-07-19', { highF: 22, precipitationChance: 80, condition: 'snow' })];
    expect(brief(todayWith(steady, { daily })).at(-1)).toBe('Tomorrow: 8° cooler, snow likely.');
  });

  it('calls highs within the threshold similar', () => {
    const daily = [day('2026-07-18', { highF: 79 }), day('2026-07-19', { highF: 81 })];
    expect(brief(todayWith(steady, { daily })).at(-1)).toBe('Tomorrow: similar temperatures.');
  });

  it('converts a difference by the scale factor alone in metric', () => {
    const daily = [day('2026-07-18', { highF: 80 }), day('2026-07-19', { highF: 71 })];
    expect(brief(todayWith(steady, { daily })).at(-1)).toBe('Tomorrow: 9° cooler.');
    // 9°F is 5°C of difference — not the −13° the absolute formula would give.
    expect(brief(todayWith(steady, { daily }), 'metric').at(-1)).toBe('Tomorrow: 5° cooler.');
  });

  it('leaves rain out, not the comparison, when tomorrow’s chance is missing', () => {
    const daily = [day('2026-07-18', { highF: 79 }), day('2026-07-19', { highF: 71, precipitationChance: null })];
    expect(brief(todayWith(steady, { daily })).at(-1)).toBe('Tomorrow: 8° cooler.');
  });

  it('says nothing when the next row is not actually tomorrow', () => {
    // The normalizer dropped Sunday; Monday must not pass itself off as tomorrow.
    const daily = [day('2026-07-18', { highF: 79 }), day('2026-07-20', { highF: 60 })];
    expect(brief(todayWith(steady, { daily })).some((s) => s.startsWith('Tomorrow'))).toBe(false);
  });

  it('says nothing without a tomorrow at all', () => {
    expect(brief(todayWith(steady, { daily: [] })).some((s) => s.startsWith('Tomorrow'))).toBe(false);
    expect(brief(todayWith(steady, { daily: [day('2026-07-18')] })).some((s) => s.startsWith('Tomorrow'))).toBe(false);
  });

  it('compares a later day with the day before it, named as the picker names it', () => {
    // Sunday 83° against today's 79°; Monday 71° against Sunday, which is tomorrow.
    expect(onDay(mockWeekWeatherData, '2026-07-19').at(-1)).toBe('4° warmer than today.');
    expect(onDay(mockWeekWeatherData, '2026-07-20').at(-1)).toBe('12° cooler than tomorrow.');
  });

  it('names the day before by its weekday further out', () => {
    const daily = [...mockWeekWeatherData.daily, day('2026-07-21', { highF: 74 })];
    const tuesday: ForecastDayOption = { date: '2026-07-21', label: 'Tue', isToday: false };
    const sentences = brief({ ...mockWeekWeatherData, daily, hourly: hoursFrom('2026-07-21T00', 24) }, 'imperial', tuesday);
    expect(sentences.at(-1)).toBe('3° warmer than Monday.');
  });

  it('calls a later day’s high similar when it is within the threshold', () => {
    const daily = [...mockWeekWeatherData.daily, day('2026-07-21', { highF: 72 })];
    const tuesday: ForecastDayOption = { date: '2026-07-21', label: 'Tue', isToday: false };
    const sentences = brief({ ...mockWeekWeatherData, daily, hourly: hoursFrom('2026-07-21T00', 24) }, 'imperial', tuesday);
    expect(sentences.at(-1)).toBe('Similar temperatures to Monday.');
  });

  it('converts a later day’s difference too', () => {
    // Monday is 12°F cooler than Sunday: 6.7°C, shown as 7°.
    expect(onDay(mockWeekWeatherData, '2026-07-20', 'metric').at(-1)).toBe('7° cooler than tomorrow.');
  });

  it('leaves the comparison out for a later day the daily series doesn’t cover', () => {
    const stale: ForecastDayOption = { date: '2026-07-25', label: 'Sat', isToday: false };
    const sentences = laterDayWith(hoursFrom('2026-07-25T00', 24), stale);
    expect(sentences.some((s) => /than|similar/i.test(s))).toBe(false);
    // The day's own hours still speak for themselves.
    expect(sentences[0]).toBe('Dry all day.');
  });
});

describe('buildBriefing — as a whole', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns nothing at all without hourly data, comparison included', () => {
    expect(brief(todayWith([]))).toEqual([]);
    expect(laterDayWith([])).toEqual([]);
  });

  it('puts the sentences in order — rain, temperature, wind, comparison — and never more than four', () => {
    const stormy = (index: number) => ({
      ...rainFrom(6, 9)(index),
      temperatureF: index <= 6 ? 60 + index * 2 : 60,
      windGustMph: index >= 5 ? 40 : 10,
    });
    expect(brief(todayWith(hoursFrom('2026-07-18T09', 24, stormy)))).toEqual([
      'Rain likely from about 3 PM until 6 PM.',
      'Warming to 72° by 3 PM.',
      'Gusty from 2 PM, up to 40 mph.',
      'Tomorrow: 4° warmer.',
    ]);
  });

  it('describes the fixture’s day in plain sentences', () => {
    expect(brief(mockWeatherData)).toEqual(['Dry for the next 8 hours.', 'Warming to 77° by 3 PM.', 'Tomorrow: 4° warmer.']);
  });

  it('reads no clock: the same forecast gives the same briefing whenever it is read', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T03:00:00Z'));
    const early = brief(mockWeekWeatherData);
    vi.setSystemTime(new Date('2030-06-15T22:00:00Z'));
    expect(brief(mockWeekWeatherData)).toEqual(early);
  });

  it('describes today, not a later day, when today is the chosen day', () => {
    const [today] = listForecastDays(mockWeekWeatherData);
    expect(brief(mockWeekWeatherData, 'imperial', today)).toEqual(brief(mockWeekWeatherData));
  });
});
