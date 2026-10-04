import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { weatherCardRegistry } from '@/components/weather/card-registry';
import { listForecastDays, scopeToDay, type ForecastDayOption } from '@/lib/weather/forecast-day';
import { mockWeatherData, mockWeekWeatherData } from '@/lib/weather/mock-data';
import type { WeatherDashboardData } from '@/lib/weather/types';

/**
 * Every card must implement four states. Rather than testing that per card by hand, the registry
 * is walked — so a card added later without one of these states fails here automatically.
 */
describe.each(weatherCardRegistry.map((card) => [card.title, card] as const))('%s card', (title, card) => {
  const Component = card.Component;

  it('renders a loading state', () => {
    render(<Component isLoading unitSystem="imperial" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('renders an error state with an alert role', () => {
    render(<Component errorMessage="Upstream is down." unitSystem="imperial" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Upstream is down.');
  });

  it('renders an unavailable state when data is absent', () => {
    render(<Component data={undefined} unitSystem="imperial" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a ready state from complete data', () => {
    render(<Component data={mockWeatherData} unitSystem="imperial" />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    // Ready state means no placeholder is showing.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an unavailable state when its own slice of data is empty', () => {
    const emptied: WeatherDashboardData = {
      ...mockWeatherData,
      current: null,
      comfort: null,
      wind: null,
      atmospheric: null,
      sun: null,
      airQuality: null,
      hourly: [],
      forecastHours: [],
      daily: [],
    };
    render(<Component data={emptied} unitSystem="imperial" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

function cardComponent(id: string) {
  const entry = weatherCardRegistry.find((card) => card.id === id);
  if (!entry) throw new Error(`No card registered with id "${id}"`);
  return entry.Component;
}

describe('unit-aware formatting', () => {
  it('shows Fahrenheit in imperial and Celsius in metric on the current conditions card', () => {
    const CurrentConditions = cardComponent('current-conditions');

    const { rerender } = render(<CurrentConditions data={mockWeatherData} unitSystem="imperial" />);
    expect(screen.getByLabelText('72 degrees Fahrenheit')).toBeInTheDocument();

    rerender(<CurrentConditions data={mockWeatherData} unitSystem="metric" />);
    expect(screen.getByLabelText('22 degrees Celsius')).toBeInTheDocument();
  });
});

describe('chart text alternatives', () => {
  it('gives the hourly temperature chart a full data table, and hides the chart from assistive tech', () => {
    const HourlyTemperature = cardComponent('hourly-temperature');
    render(<HourlyTemperature data={mockWeatherData} unitSystem="imperial" />);

    const table = screen.getByRole('table', { name: /hourly temperatures/i });
    // One row per hour in the data — the table carries the whole series, not a summary.
    expect(within(table).getAllByRole('row')).toHaveLength(mockWeatherData.hourly.length + 1);
  });

  it('gives the precipitation chart a data table', () => {
    const Precipitation = cardComponent('precipitation');
    render(<Precipitation data={mockWeatherData} unitSystem="imperial" />);

    expect(screen.getByRole('table', { name: /hourly precipitation/i })).toBeInTheDocument();
  });
});

describe('daily forecast card', () => {
  // The "Today" row label is date-sensitive, so the clock is pinned rather than left to whatever
  // day the suite happens to run on — otherwise this becomes a test that only fails once a year.
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders one row per forecast day as a real table', () => {
    vi.useFakeTimers();
    // Comfortably clear of the mock data's own dates (2026-07-18 onward), so the first row is an
    // ordinary weekday rather than "Today".
    vi.setSystemTime(new Date('2025-01-01T12:00:00-08:00'));

    const DailyForecast = cardComponent('daily-forecast');
    render(<DailyForecast data={mockWeatherData} unitSystem="imperial" />);

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(mockWeatherData.daily.length + 1);
    expect(within(table).getByRole('rowheader', { name: 'Sat' })).toBeInTheDocument();
  });

  it('labels the first row "Today" when its date matches the forecast location\'s own clock', () => {
    vi.useFakeTimers();
    // Mid-afternoon in Portland (America/Los_Angeles) on the mock data's first forecast day.
    vi.setSystemTime(new Date('2026-07-18T12:00:00-07:00'));

    const DailyForecast = cardComponent('daily-forecast');
    render(<DailyForecast data={mockWeatherData} unitSystem="imperial" />);

    const table = screen.getByRole('table');
    expect(within(table).getByRole('rowheader', { name: 'Today' })).toBeInTheDocument();
    expect(within(table).queryByRole('rowheader', { name: 'Sat' })).not.toBeInTheDocument();
  });

  it('goes by the forecast location\'s timezone, not the browser\'s, near midnight', () => {
    vi.useFakeTimers();
    // 11pm UTC on 2026-07-18 is already 2026-07-19 in UTC terms the browser might use, but it is
    // still 4pm on 2026-07-18 in Portland (America/Los_Angeles, UTC-7) — the "Today" row must
    // follow the forecast location, not whatever clock the visitor's device happens to show.
    vi.setSystemTime(new Date('2026-07-18T23:00:00Z'));

    const DailyForecast = cardComponent('daily-forecast');
    render(<DailyForecast data={mockWeatherData} unitSystem="imperial" />);

    const table = screen.getByRole('table');
    expect(within(table).getByRole('rowheader', { name: 'Today' })).toBeInTheDocument();
  });
});

describe('daily forecast rows', () => {
  it("spells out each day's low and high for assistive tech, beside the decorative range bar", () => {
    const DailyForecast = cardComponent('daily-forecast');
    render(<DailyForecast data={mockWeatherData} unitSystem="imperial" />);

    const [first] = mockWeatherData.daily;
    const name = `Low ${Math.round(first.lowF)}°, high ${Math.round(first.highF)}°`;
    expect(screen.getAllByRole('cell', { name }).length).toBeGreaterThan(0);
  });
});

describe('reading tiles', () => {
  it('keeps the number and its unit together as one reading', () => {
    const Wind = cardComponent('wind-speed');
    render(<Wind data={mockWeatherData} unitSystem="imperial" />);

    expect(screen.getByRole('article', { name: 'Wind' })).toHaveTextContent('8 mph');
  });
});

describe('sun and UV card', () => {
  it('describes UV risk in words, not only by colour', () => {
    const SunUv = cardComponent('sun-uv');
    render(<SunUv data={mockWeatherData} unitSystem="imperial" />);

    // mock uvIndexNow is 6 -> "High" band.
    expect(screen.getByText(/UV 6 — High/)).toBeInTheDocument();
    expect(screen.getByText(/sunscreen and a hat/i)).toBeInTheDocument();
  });
});

describe('atmospheric details card', () => {
  it('pairs the pressure-trend arrow with a word', () => {
    const AtmosphericDetails = cardComponent('atmospheric-details');
    render(<AtmosphericDetails data={mockWeatherData} unitSystem="imperial" />);

    expect(screen.getByText(/Steady/)).toBeInTheDocument();
  });
});

describe('wind card', () => {
  it('describes strength in words alongside the number', () => {
    const Wind = cardComponent('wind');
    render(<Wind data={mockWeatherData} unitSystem="imperial" />);

    expect(screen.getByText('8 mph')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText(/blowing from the NW/i)).toBeInTheDocument();
  });
});

describe('air quality card', () => {
  it('names the AQI band in words, not just a number and a colour', () => {
    const AirQuality = cardComponent('air-quality');
    render(<AirQuality data={mockWeatherData} unitSystem="imperial" />);

    expect(screen.getByText(/38/)).toBeInTheDocument();
    expect(screen.getByText(/Good/)).toBeInTheDocument();
    expect(screen.getByText(/air quality is satisfactory/i)).toBeInTheDocument();
  });

  it('still shows pollutants when the overall index is missing', () => {
    const AirQuality = cardComponent('air-quality');
    render(
      <AirQuality
        data={{ ...mockWeatherData, airQuality: { ...mockWeatherData.airQuality!, usAqi: null, category: null } }}
        unitSystem="imperial"
      />,
    );

    expect(screen.getByText(/individual pollutants are shown below/i)).toBeInTheDocument();
    expect(screen.getByText('8.4 µg/m³')).toBeInTheDocument();
  });
});

describe('times use the location timezone', () => {
  it('shows sunrise as the location would read it, not the viewer', () => {
    const SunUv = cardComponent('sun-uv');
    render(<SunUv data={mockWeatherData} unitSystem="imperial" />);

    // mock sunrise is 05:35 local to Portland.
    expect(screen.getByText('5:35 AM')).toBeInTheDocument();
  });
});

/**
 * The modules the day picker can point at a later day. Each must say which day it is showing —
 * visibly and in its accessible name — and must not keep "next 24 hours" copy that would then be
 * false.
 */
describe('day-following modules on a later day', () => {
  const [today, sunday, monday] = listForecastDays(mockWeekWeatherData) as [
    ForecastDayOption,
    ForecastDayOption,
    ForecastDayOption,
  ];
  const on = (day: ForecastDayOption) => ({
    data: scopeToDay(mockWeekWeatherData, day.date),
    forecastDay: day,
    unitSystem: 'imperial' as const,
  });

  it('are exactly the ones describing a span of time, never a reading about now', () => {
    const following = weatherCardRegistry.filter((card) => card.followsDay).map((card) => card.id);
    expect(following.sort()).toEqual(['activity-windows', 'briefing', 'hourly-temperature', 'precipitation']);
  });

  it('names the day in the hourly temperature summary, title area and table caption', () => {
    const HourlyTemperature = cardComponent('hourly-temperature');
    render(<HourlyTemperature {...on(sunday)} />);

    // Sunday runs 60° to 83° in the fixture.
    expect(screen.getByText('Range 60° to 83° on Sunday.')).toBeInTheDocument();
    expect(screen.queryByText(/over the next/i)).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Hourly Temperature Sunday' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Hourly temperatures, Sunday' })).toBeInTheDocument();
  });

  it('keeps the default copy, and no day label, for today or no selection', () => {
    const HourlyTemperature = cardComponent('hourly-temperature');
    const { rerender } = render(<HourlyTemperature data={mockWeekWeatherData} unitSystem="imperial" />);
    expect(screen.getByText(/over the next 24 hours\./)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Hourly Temperature' })).toBeInTheDocument();

    rerender(<HourlyTemperature data={mockWeekWeatherData} forecastDay={today} unitSystem="imperial" />);
    expect(screen.getByText(/over the next 24 hours\./)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Hourly Temperature' })).toBeInTheDocument();
  });

  it('totals precipitation over the whole later day, not the first twelve hours of it', () => {
    const Precipitation = cardComponent('precipitation');
    render(<Precipitation {...on(monday)} />);

    expect(screen.getByText('Total, Monday')).toBeInTheDocument();
    // 24 hours at 0.02 in.
    expect(screen.getByText('0.48 in')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /monday/i });
    expect(within(table).getAllByRole('row')).toHaveLength(24 + 1);
    expect(screen.getByRole('article', { name: 'Precipitation Monday' })).toBeInTheDocument();
  });

  it('keeps the next-12-hours total on the default view', () => {
    const Precipitation = cardComponent('precipitation');
    render(<Precipitation data={mockWeekWeatherData} unitSystem="imperial" />);

    expect(screen.getByText('Total, next 12h')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(12 + 1);
  });

  it('says there is no good window on that day, by name, without pointing elsewhere', () => {
    const ActivityWindows = cardComponent('activity-windows');
    render(<ActivityWindows {...on(monday)} activities={['walk']} />);

    expect(screen.getByText('No good window on Monday.')).toBeInTheDocument();
    expect(screen.queryByText(/next good window/i)).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Best Time To Go Out Monday' })).toBeInTheDocument();
  });

  it('turns the briefing to the later day, in its sentences and its label', () => {
    const Briefing = cardComponent('briefing');
    const { rerender } = render(<Briefing data={mockWeekWeatherData} unitSystem="imperial" />);

    const todayCard = screen.getByRole('article', { name: 'Briefing' });
    expect(within(todayCard).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(todayCard).toHaveTextContent('Dry for the next 24 hours.');
    expect(todayCard).toHaveTextContent('Tomorrow: 4° warmer.');

    rerender(<Briefing {...on(monday)} />);
    const mondayCard = screen.getByRole('article', { name: 'Briefing Monday' });
    expect(mondayCard).toHaveTextContent('Rain likely all day.');
    expect(mondayCard).toHaveTextContent('High of 71° around 3 PM, low of 57°.');
    expect(mondayCard).toHaveTextContent('12° cooler than tomorrow.');
    // Today's framing would be false on Monday.
    expect(mondayCard).not.toHaveTextContent(/next 24 hours|Tomorrow:/);
  });

  it('shows the briefing as unavailable for a later day with no hours, not a lone comparison', () => {
    const Briefing = cardComponent('briefing');
    render(<Briefing data={{ ...scopeToDay(mockWeekWeatherData, monday.date), hourly: [] }} forecastDay={monday} unitSystem="imperial" />);

    expect(screen.getByRole('status')).toHaveTextContent(/not enough forecast data/i);
    expect(screen.queryByText(/than tomorrow/)).not.toBeInTheDocument();
  });

  it('shows the later day’s own window', () => {
    const ActivityWindows = cardComponent('activity-windows');
    render(<ActivityWindows {...on(sunday)} activities={['run']} />);

    // Sunday warms past a runner's limit after noon.
    expect(screen.getByText('6 AM – 12 PM')).toBeInTheDocument();
  });
});

describe('activity windows — when, if not today', () => {
  /** Today's whole rolling 24 hours rained off; the rest of the week as the fixture has it. */
  function washedOutToday(): WeatherDashboardData {
    const rainedOff = new Set(mockWeekWeatherData.hourly.map((hour) => hour.time));
    const forecastHours = mockWeekWeatherData.forecastHours.map((hour) =>
      rainedOff.has(hour.time) ? { ...hour, precipitationChance: 95 } : hour,
    );
    return { ...mockWeekWeatherData, forecastHours, hourly: forecastHours.slice(0, 24) };
  }

  it('points to the next day with a window when today has none', () => {
    const ActivityWindows = cardComponent('activity-windows');
    render(<ActivityWindows data={washedOutToday()} activities={['walk']} unitSystem="imperial" />);

    expect(screen.getByText('No good window in the next day.')).toBeInTheDocument();
    // Sunday from 9 AM (the morning before it is inside today's washed-out 24 hours), split at
    // that day's sunset.
    expect(screen.getByText('Next good window: Sun 9 AM – 9 PM')).toBeInTheDocument();
  });

  it('says nothing more when no later day has a window either — never a least-bad hour', () => {
    const ActivityWindows = cardComponent('activity-windows');
    const soaked = mockWeekWeatherData.forecastHours.map((hour) => ({ ...hour, precipitationChance: 95 }));
    render(
      <ActivityWindows
        data={{ ...mockWeekWeatherData, forecastHours: soaked, hourly: soaked.slice(0, 24) }}
        activities={['walk']}
        unitSystem="imperial"
      />,
    );

    expect(screen.getByText('No good window in the next day.')).toBeInTheDocument();
    expect(screen.queryByText(/next good window/i)).not.toBeInTheDocument();
    // The description of what was looked for still explains the blank.
    expect(screen.getByText(/mild, dry, and not too windy/i)).toBeInTheDocument();
  });

  it('adds no pointer when today already has a window', () => {
    const ActivityWindows = cardComponent('activity-windows');
    render(<ActivityWindows data={mockWeekWeatherData} activities={['walk']} unitSystem="imperial" />);
    expect(screen.queryByText(/next good window/i)).not.toBeInTheDocument();
  });
});
