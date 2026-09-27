import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { Hero } from '@/components/dashboard/hero';
import { rainRangeLabel } from '@/components/dashboard/hourly-strip';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION, coordinatesToLocation } from '@/lib/weather/location';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { WeatherDashboardData } from '@/lib/weather/types';
import type { UnitSystem } from '@/lib/weather/units';
import { useDashboardStore } from '@/store/dashboard-store';

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function renderHero(data: WeatherDashboardData | undefined = mockWeatherData, unitSystem: UnitSystem = 'imperial') {
  return render(
    <Hero
      location={DEFAULT_LOCATION}
      data={data}
      isLoading={false}
      unitSystem={unitSystem}
      onRefresh={() => {}}
      isRefreshing={false}
      isStale={false}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  useDashboardStore.setState({
    location: DEFAULT_LOCATION,
    unitSystem: 'imperial',
    cards: DEFAULT_CARD_LAYOUT,
    isEditing: false,
    hasOnboarded: true,
  });
});

describe('hero summary', () => {
  it("states today's high and low and the next sun event, once the dashboard has loaded", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(mockWeatherData)));

    render(<Dashboard />);

    // Sunset is 20:52 in Portland; the time is read in the location's zone, not the test runner's.
    expect(await screen.findByText('High of 79°, low of 58°. Sunset at 8:52 PM.')).toBeInTheDocument();
  });

  it('names the sky and the part of the day in its heading', () => {
    renderHero();
    expect(screen.getByRole('heading', { level: 3, name: 'Partly Cloudy Afternoon' })).toBeInTheDocument();
  });

  it('mentions sunrise rather than sunset at night', () => {
    renderHero({
      ...mockWeatherData,
      current: { ...mockWeatherData.current!, isDay: false, condition: 'sunny', observedAt: '2026-07-18T23:00:00-07:00' },
    });
    expect(screen.getByRole('heading', { level: 3, name: 'Clear Night' })).toBeInTheDocument();
    expect(screen.getByText(/Sunrise at 5:35 AM\./)).toBeInTheDocument();
  });

  it('leaves out the sun sentence rather than inventing a time when sun data is missing', () => {
    renderHero({ ...mockWeatherData, sun: null });
    expect(screen.getByText('High of 79°, low of 58°.')).toBeInTheDocument();
  });

  it('follows the unit setting', () => {
    renderHero(mockWeatherData, 'metric');
    expect(screen.getByText(/^High of 26°, low of 14°\./)).toBeInTheDocument();
  });
});

describe('hero region chip', () => {
  it("shows the reading's region and country", () => {
    renderHero();
    expect(screen.getByText('Oregon • United States')).toBeInTheDocument();
  });

  it('shows just the country when there is no region', () => {
    renderHero({ ...mockWeatherData, location: { ...mockWeatherData.location, region: '' } });
    expect(screen.getByText('United States')).toBeInTheDocument();
  });

  it('is omitted, not guessed, for a place with no names', () => {
    // Air quality is dropped too: its strip also uses "•", and this asserts on the separator.
    render(
      <Hero
        location={coordinatesToLocation(45, -122)}
        data={{ ...mockWeatherData, airQuality: null, location: { ...mockWeatherData.location, region: '', country: '' } }}
        isLoading={false}
        unitSystem="imperial"
        onRefresh={() => {}}
        isRefreshing={false}
        isStale={false}
      />,
    );
    expect(screen.queryByText(/•/)).toBeNull();
  });
});

describe('hero air quality strip', () => {
  it('states the category, the US AQI and PM2.5', () => {
    renderHero();
    expect(screen.getByText('Air Quality: Good')).toBeInTheDocument();
    expect(screen.getByText('US AQI 38 • PM2.5 8 µg/m³')).toBeInTheDocument();
  });

  it('is hidden entirely when air quality is unavailable', () => {
    renderHero({ ...mockWeatherData, airQuality: null });
    expect(screen.queryByText(/air quality/i)).toBeNull();
  });

  it('dashes a single missing reading instead of hiding the others', () => {
    renderHero({ ...mockWeatherData, airQuality: { ...mockWeatherData.airQuality!, pm2_5: null } });
    expect(screen.getByText('US AQI 38 • PM2.5 —')).toBeInTheDocument();
  });
});

describe('right now card', () => {
  it('shows the temperature, rain odds and quick readings', () => {
    renderHero();

    expect(screen.getByText('72 degrees Fahrenheit')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('Next hour')).toBeInTheDocument();

    const stats = screen.getByText('High and low').closest('dl') as HTMLElement;
    const values = within(stats).getAllByRole('definition').map((node) => node.textContent);
    expect(values).toEqual(['79° / 58°', '74°', '55°', '30.08 inHg']);
  });

  it('dashes missing dew point and pressure rather than inventing them', () => {
    renderHero({ ...mockWeatherData, atmospheric: null, comfort: null });

    const stats = screen.getByText('Dew point').closest('dl') as HTMLElement;
    const values = within(stats).getAllByRole('definition').map((node) => node.textContent);
    expect(values.slice(2)).toEqual(['—', '—']);
  });

  it('follows the unit setting', () => {
    renderHero(mockWeatherData, 'metric');
    expect(screen.getByText('22 degrees Celsius')).toBeInTheDocument();
    const stats = screen.getByText('Pressure').closest('dl') as HTMLElement;
    expect(within(stats).getAllByRole('definition').at(-1)).toHaveTextContent('1019 hPa');
  });
});

describe('next hours strip', () => {
  it('lists each hour with its time, temperature and condition in text', () => {
    renderHero();

    const list = screen.getByRole('list', { name: /next hours/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(mockWeatherData.hourly.length);
    expect(items[0]).toHaveTextContent('9 AM');
    expect(items[0]).toHaveTextContent('62°');
    expect(items[0]).toHaveTextContent('Clouds');
    expect(items[0]).toHaveTextContent('8% chance of rain');
  });

  it('marks the hour containing the observation as now, with the observed reading and its clock hour', () => {
    renderHero();

    const items = within(screen.getByRole('list', { name: /next hours/i })).getAllByRole('listitem');
    const now = items.find((item) => item.textContent?.includes('Now'));
    expect(now).toBeDefined();
    expect(now).toHaveTextContent('3 PM');
    // The observed 72°, not the 77° forecast for the hour, so it matches the card above it.
    expect(now).toHaveTextContent('72°');
  });

  it('summarises the rain range of the hours shown', () => {
    renderHero();
    expect(screen.getByText('Rain 6–18%')).toBeInTheDocument();
    expect(rainRangeLabel([])).toBeNull();
    expect(rainRangeLabel(mockWeatherData.hourly.slice(0, 1))).toBe('Rain 8%');
  });
});

describe('hero failure states', () => {
  it('says the reading is stale without hiding it', () => {
    render(
      <Hero
        location={DEFAULT_LOCATION}
        data={mockWeatherData}
        isLoading={false}
        unitSystem="imperial"
        onRefresh={() => {}}
        isRefreshing={false}
        isStale
        failureMessage="Couldn't reach the weather service."
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/showing the last reading that loaded/i);
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
  });

  it('offers a retry when there is no reading at all', () => {
    const onRefresh = vi.fn();
    render(
      <Hero
        location={DEFAULT_LOCATION}
        isLoading={false}
        errorMessage="The weather service is having trouble."
        unitSystem="imperial"
        onRefresh={onRefresh}
        isRefreshing={false}
        isStale={false}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('The weather service is having trouble.');
    screen.getByRole('button', { name: /try again/i }).click();
    expect(onRefresh).toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: /next hours/i })).toBeNull();
  });
});
