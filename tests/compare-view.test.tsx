import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CompareLocationPicker, SAME_PLACE_MESSAGE } from '@/components/compare/compare-location-picker';
import { CompareView } from '@/components/compare/compare-view';
import type { UseWeatherDataResult } from '@/lib/hooks/use-weather-data';
import type { CompareLayout } from '@/lib/weather/compare';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { WeatherDashboardData } from '@/lib/weather/types';
import type { UnitSystem } from '@/lib/weather/units';

const PORTLAND = DEFAULT_LOCATION;
const LISBON: SelectedLocation = {
  id: '2267057',
  name: 'Lisbon',
  region: 'Lisbon',
  country: 'Portugal',
  latitude: 38.7167,
  longitude: -9.1333,
};
const TOKYO: SelectedLocation = {
  id: '1850147',
  name: 'Tokyo',
  region: 'Tokyo',
  country: 'Japan',
  latitude: 35.6895,
  longitude: 139.6917,
};

/**
 * Lisbon is a calendar day ahead of Portland's fixture (Sat 18 – Mon 20 July): its forecast runs
 * Sun 19 – Tue 21. So the aligned table has four rows, with Lisbon missing Saturday and Portland
 * missing Tuesday — exactly the timezone offset the date alignment exists for.
 */
const LISBON_DATA: WeatherDashboardData = {
  ...mockWeatherData,
  location: { ...mockWeatherData.location, name: 'Lisbon', region: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon' },
  current: { ...mockWeatherData.current!, temperatureF: 80, condition: 'sunny', conditionLabel: 'Clear sky' },
  daily: [
    { ...mockWeatherData.daily[0], date: '2026-07-19', condition: 'sunny', conditionLabel: 'Clear sky', highF: 86, lowF: 66 },
    { ...mockWeatherData.daily[1], date: '2026-07-20', highF: 88, lowF: 67 },
    { ...mockWeatherData.daily[2], date: '2026-07-21', highF: 84, lowF: 65, precipitationChance: null },
  ],
};

function ready(data: WeatherDashboardData): UseWeatherDataResult {
  return { state: { status: 'ready', data }, refresh: vi.fn(), isRefreshing: false };
}

function failed(staleData?: WeatherDashboardData): UseWeatherDataResult {
  return {
    state: { status: 'error', errorMessage: 'Weather service unavailable.' },
    refresh: vi.fn(),
    isRefreshing: false,
    staleData,
  };
}

const LOADING: UseWeatherDataResult = { state: { status: 'loading' }, refresh: vi.fn(), isRefreshing: false };

type ViewProps = Parameters<typeof CompareView>[0];

function renderView(overrides: Partial<ViewProps> = {}) {
  const props: ViewProps = {
    mainLocation: PORTLAND,
    compareLocation: LISBON,
    mainWeather: ready(mockWeatherData),
    compareWeather: ready(LISBON_DATA),
    unitSystem: 'imperial' as UnitSystem,
    layout: 'by-day',
    onLayoutChange: vi.fn(),
    savedLocations: [PORTLAND, LISBON, TOKYO],
    onSelectCompare: vi.fn(),
    onChangeCompare: vi.fn(),
    onSwap: vi.fn(),
    onDone: vi.fn(),
    ...overrides,
  };
  const view = render(<CompareView {...props} />);
  return { props, ...view };
}

/** CompareView with its layout held in state, as the dashboard holds it in the store. */
function ToggleHarness() {
  const [layout, setLayout] = useState<CompareLayout>('by-day');
  return (
    <CompareView
      mainLocation={PORTLAND}
      compareLocation={LISBON}
      mainWeather={ready(mockWeatherData)}
      compareWeather={ready(LISBON_DATA)}
      unitSystem="imperial"
      layout={layout}
      onLayoutChange={setLayout}
      savedLocations={[]}
      onSelectCompare={vi.fn()}
      onChangeCompare={vi.fn()}
      onSwap={vi.fn()}
      onDone={vi.fn()}
    />
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CompareView — opening', () => {
  it('moves focus to its "Compare" heading, so the change of view is announced', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 2, name: 'Compare' })).toHaveFocus();
  });

  it('leaves from Done', () => {
    const { props } = renderView();
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(props.onDone).toHaveBeenCalledTimes(1);
  });
});

describe('CompareView — empty state', () => {
  it('prompts for a place, offers the picker, and lists saved places other than the main one', () => {
    const { props } = renderView({ compareLocation: null, compareWeather: LOADING });

    expect(screen.getByRole('heading', { name: /pick a place to compare with/i })).toBeInTheDocument();
    // No week to set beside anything yet.
    expect(screen.queryByRole('group', { name: '7-day forecast' })).toBeNull();

    const choose = screen.getByRole('button', { name: /choose a place/i });
    fireEvent.click(choose);
    expect(props.onChangeCompare).toHaveBeenCalledWith(choose);

    const saved = screen.getByRole('list', { name: 'Saved places' });
    const chips = within(saved).getAllByRole('button');
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Compare with Lisbon, Lisbon, Portugal',
      'Compare with Tokyo, Tokyo, Japan',
    ]);

    fireEvent.click(chips[0]);
    expect(props.onSelectCompare).toHaveBeenCalledWith(LISBON);
  });
});

describe('CompareView — right now', () => {
  it('shows both places with temperature, condition in words, and the difference sentence', () => {
    renderView();

    const portland = screen.getByRole('article', { name: 'Portland' });
    const lisbon = screen.getByRole('article', { name: 'Lisbon' });
    expect(within(portland).getByText('Main location')).toBeInTheDocument();
    expect(within(portland).getByText('Partly cloudy')).toBeInTheDocument();
    expect(within(lisbon).getByText('Compared with')).toBeInTheDocument();
    expect(within(lisbon).getByText('Clear sky')).toBeInTheDocument();
    expect(within(lisbon).getByText('80°')).toBeInTheDocument();

    expect(screen.getByText('Lisbon is 8° warmer than Portland right now.')).toBeInTheDocument();
  });

  it('works out the sentence in the chosen unit, from the numbers as shown', () => {
    renderView({ unitSystem: 'metric' });
    // 72°F → 22°C, 80°F → 27°C: five degrees as printed, not 4.4 rounded after the fact.
    expect(screen.getByText('Lisbon is 5° warmer than Portland right now.')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Lisbon' })).getByText('27°')).toBeInTheDocument();
  });

  it('says nothing about the difference until both places have loaded', () => {
    renderView({ compareWeather: LOADING });
    expect(screen.queryByText(/warmer|cooler|about the same/)).toBeNull();
    expect(within(screen.getByRole('article', { name: 'Lisbon' })).getByRole('status')).toHaveTextContent(
      /loading current conditions for lisbon/i,
    );
  });

  it('opens the picker from Change and swaps from a button naming what it does', () => {
    const { props } = renderView();
    const lisbon = screen.getByRole('article', { name: 'Lisbon' });

    const change = within(lisbon).getByRole('button', { name: /^change/i });
    fireEvent.click(change);
    expect(props.onChangeCompare).toHaveBeenCalledWith(change);

    fireEvent.click(within(lisbon).getByRole('button', { name: /make lisbon my main location/i }));
    expect(props.onSwap).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/lisbon is now your main location/i)).toBeInTheDocument();

    // The main place carries neither control.
    expect(within(screen.getByRole('article', { name: 'Portland' })).queryAllByRole('button')).toHaveLength(0);
  });
});

describe('CompareView — one place failing', () => {
  it('keeps the other place on screen and retries only the place that failed', () => {
    const compareWeather = failed();
    renderView({ compareWeather });

    const portland = screen.getByRole('article', { name: 'Portland' });
    expect(within(portland).getByText('72°')).toBeInTheDocument();

    const lisbon = screen.getByRole('article', { name: 'Lisbon' });
    expect(within(lisbon).getByRole('alert')).toHaveTextContent('Weather service unavailable.');
    fireEvent.click(within(lisbon).getByRole('button', { name: /try again for lisbon/i }));
    expect(compareWeather.refresh).toHaveBeenCalledTimes(1);

    // The week falls back to Portland's alone, with a line saying why Lisbon's is missing.
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Portland' })).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Lisbon' })).toBeNull();
    expect(screen.getByText(/the forecast for lisbon didn’t load/i)).toBeInTheDocument();
  });

  it('shows the last good reading with a note rather than emptying the card', () => {
    renderView({ compareWeather: failed(LISBON_DATA) });

    const lisbon = screen.getByRole('article', { name: 'Lisbon' });
    expect(within(lisbon).getByText('80°')).toBeInTheDocument();
    expect(within(lisbon).getByRole('status')).toHaveTextContent(/showing the last reading that loaded/i);
    expect(within(lisbon).getByRole('button', { name: /try again for lisbon/i })).toBeInTheDocument();
    // No sentence from a stale reading.
    expect(screen.queryByText(/warmer|cooler/)).toBeNull();
  });
});

describe('CompareView — by day', () => {
  it('is a real table, captioned with both places and headed per place', () => {
    renderView();
    const table = screen.getByRole('table', { name: /7-day forecast by day for portland and lisbon/i });
    expect(within(table).getByRole('columnheader', { name: 'Portland' })).toHaveAttribute('scope', 'colgroup');
    expect(within(table).getByRole('columnheader', { name: 'Lisbon' })).toHaveAttribute('scope', 'colgroup');
  });

  it('aligns rows by date when the compared place is a day ahead, marking each missing side', () => {
    renderView();
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(2);

    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
      'Today',
      'Tomorrow',
      'Mon',
      'Tue',
    ]);

    // Saturday: Portland's own day, and nothing borrowed for Lisbon.
    expect(rows[0]).toHaveTextContent('No forecast for Lisbon today');
    expect(rows[0]).toHaveTextContent('Low 58°, high 79°');
    // Sunday: both places, each its own Sunday.
    expect(rows[1]).toHaveTextContent('Low 60°, high 83°');
    expect(rows[1]).toHaveTextContent('Low 66°, high 86°');
    expect(rows[1]).not.toHaveTextContent('No forecast');
    // Tuesday is beyond Portland's forecast.
    expect(rows[3]).toHaveTextContent('No forecast for Portland on Tuesday');
    expect(rows[3]).toHaveTextContent('Low 65°, high 84°');
    // A missing rain chance is a dash, not a zero.
    expect(within(rows[3]).getAllByText('—')).toHaveLength(2);
  });
});

describe('CompareView — layout toggle', () => {
  it('is a radio group under the "7-day forecast" legend, switching to one table per place', () => {
    render(<ToggleHarness />);

    const group = screen.getByRole('group', { name: '7-day forecast' });
    const byDay = within(group).getByRole('radio', { name: /by day/i });
    const sideBySide = within(group).getByRole('radio', { name: /side by side/i });
    expect(byDay).toBeChecked();
    expect(screen.getAllByRole('table')).toHaveLength(1);

    fireEvent.click(sideBySide);
    expect(sideBySide).toBeChecked();
    expect(screen.getByRole('table', { name: '7-day forecast for Portland' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '7-day forecast for Lisbon' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /by day/i })).toBeNull();

    fireEvent.click(byDay);
    expect(screen.getAllByRole('table')).toHaveLength(1);
  });

  it('gives each place its own loading state side by side', () => {
    renderView({ layout: 'side-by-side', compareWeather: LOADING });
    expect(screen.getByRole('table', { name: '7-day forecast for Portland' })).toBeInTheDocument();
    expect(screen.getByText(/loading the forecast for lisbon/i)).toBeInTheDocument();
  });
});

describe('CompareLocationPicker', () => {
  function renderPicker() {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      returnFocusRef: { current: trigger },
      mainLocation: PORTLAND,
      compareLocation: LISBON,
      saved: [PORTLAND, LISBON, TOKYO],
      onSelect: vi.fn(),
    };
    render(<CompareLocationPicker {...props} />);
    return { props, trigger };
  }

  it('is a dialog that leaves the main place out of its saved chips and marks the current one', () => {
    const { props } = renderPicker();
    const dialog = screen.getByRole('dialog', { name: 'Compare with…' });
    const chips = within(dialog).getAllByRole('button', { name: /^compare with/i });
    expect(chips).toHaveLength(2);
    expect(within(dialog).queryByRole('button', { name: /compare with portland/i })).toBeNull();
    expect(chips[0]).toHaveAttribute('aria-current', 'true');

    fireEvent.click(chips[1]);
    expect(props.onSelect).toHaveBeenCalledWith(TOKYO);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('refuses the main place found by search, saying why', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [
              { id: 5746545, name: 'Portland', latitude: 45.5152, longitude: -122.6784, admin1: 'Oregon', country: 'United States' },
            ],
          }),
        ),
      ),
    );
    const { props } = renderPicker();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Portland' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /portland/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(SAME_PLACE_MESSAGE);
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape and puts focus back on whatever opened it', () => {
    const { props, trigger } = renderPicker();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(props.onClose).toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
