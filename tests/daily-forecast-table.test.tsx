import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DailyForecastTable } from '@/components/weather/daily-forecast-table';
import { mockWeatherData } from '@/lib/weather/mock-data';

const DAYS = mockWeatherData.daily;

beforeEach(() => {
  // 20:00 UTC on 18 July is 13:00 the same day in Portland, the fixture's "today".
  vi.useFakeTimers({ now: new Date('2026-07-18T20:00:00Z'), toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderTable(overrides: Partial<Parameters<typeof DailyForecastTable>[0]> = {}) {
  return render(
    <DailyForecastTable
      days={DAYS}
      scale={{ min: 57, max: 83 }}
      unitSystem="imperial"
      timeZone="America/Los_Angeles"
      caption="7-day forecast for Portland"
      {...overrides}
    />,
  );
}

describe('DailyForecastTable', () => {
  it('is a captioned table with one row per day, headed by its day', () => {
    renderTable();
    const table = screen.getByRole('table', { name: '7-day forecast for Portland' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['Today', 'Sun', 'Mon']);
  });

  it('decides "Today" in the forecast location’s timezone, not the viewer’s', () => {
    // 06:00 UTC on 19 July is still the 18th in Portland but already the 19th in Tokyo.
    vi.setSystemTime(new Date('2026-07-19T06:00:00Z'));
    renderTable();
    expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('Today');

    renderTable({ timeZone: 'Asia/Tokyo', caption: 'Tokyo' });
    const tokyo = screen.getByRole('table', { name: 'Tokyo' });
    expect(within(tokyo).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['Sat', 'Today', 'Mon']);
  });

  it('speaks each day’s low and high once, in the chosen unit, with the condition in words', () => {
    renderTable({ unitSystem: 'metric' });
    const first = screen.getAllByRole('row')[1];
    expect(first).toHaveTextContent('Low 14°, high 26°');
    expect(within(first).getByText('Partly cloudy')).toBeInTheDocument();
  });

  it('draws every bar against the scale it is given, so two tables can share one', () => {
    const { container } = renderTable({ scale: { min: 40, max: 100 } });
    const fills = container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div[style]');
    // Saturday 58–79 on 40–100: 30% in from the left, 35% in from the right.
    expect(fills[0].style.left).toBe('30%');
    expect(fills[0].style.right).toBe('35%');
  });

  it('shows a dash for a missing rain chance rather than inventing one', () => {
    renderTable({ days: [{ ...DAYS[0], precipitationChance: null }] });
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('—');
  });
});
