import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { Hero } from '@/components/dashboard/hero';
import { DEFAULT_FAVORITE_METRICS, type FavoriteMetricId } from '@/lib/weather/favorite-metrics';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION, coordinatesToLocation } from '@/lib/weather/location';
import { mockWeatherData } from '@/lib/weather/mock-data';
import type { WeatherDashboardData } from '@/lib/weather/types';
import type { UnitSystem } from '@/lib/weather/units';
import { useDashboardStore } from '@/store/dashboard-store';

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function renderHero(data: WeatherDashboardData | undefined = mockWeatherData, unitSystem: UnitSystem = 'imperial',
  favoriteMetrics: FavoriteMetricId[] = DEFAULT_FAVORITE_METRICS,
) {
  return render(
    <Hero
      location={DEFAULT_LOCATION}
      data={data}
      isLoading={false}
      unitSystem={unitSystem}
      favoriteMetrics={favoriteMetrics}
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
    render(
      <Hero
        location={coordinatesToLocation(45, -122)}
        data={{ ...mockWeatherData, location: { ...mockWeatherData.location, region: '', country: '' } }}
        isLoading={false}
        unitSystem="imperial"
        favoriteMetrics={DEFAULT_FAVORITE_METRICS}
        onRefresh={() => {}}
        isRefreshing={false}
        isStale={false}
      />,
    );
    expect(screen.queryByText(/•/)).toBeNull();
  });
});

describe('hero layout', () => {
  it('no longer carries the Right Now reading, which is a movable module now', () => {
    renderHero();
    expect(screen.queryByText('Next hour')).toBeNull();
  });
});

describe('hero favorite readings', () => {
  function readings() {
    const strip = screen.getByText('High and low').closest('dl') as HTMLElement;
    return within(strip).getAllByRole('definition').map((node) => node.textContent);
  }

  it('shows the default four where air quality used to be', () => {
    renderHero();
    expect(readings()).toEqual(['79° / 58°', '74 degrees Fahrenheit74°', '55°', '30.08inHg']);
    expect(screen.queryByText(/air quality:/i)).toBeNull();
  });

  it('shows exactly the readings chosen, in the order chosen', () => {
    renderHero(mockWeatherData, 'imperial', ['air-quality', 'humidity']);
    const strip = screen.getByText('Air quality').closest('dl') as HTMLElement;
    const terms = within(strip).getAllByRole('term').map((node) => node.textContent);
    expect(terms).toEqual(['AirAir quality', 'HumidityHumidity']);
    // The category is spoken with the number, so severity is never a number alone.
    expect(within(strip).getByText('US AQI 38, Good')).toBeInTheDocument();
    expect(within(strip).getByText('54%')).toBeInTheDocument();
  });

  it('dashes missing readings rather than inventing them', () => {
    renderHero({ ...mockWeatherData, atmospheric: null, comfort: null, airQuality: null }, 'imperial', [
      'dew',
      'pressure',
      'air-quality',
    ]);
    const strip = screen.getByText('Dew point').closest('dl') as HTMLElement;
    expect(within(strip).getAllByRole('definition').map((node) => node.textContent)).toEqual(['—', '—', '—']);
  });

  it('follows the unit setting', () => {
    renderHero(mockWeatherData, 'metric');
    const strip = screen.getByText('Pressure').closest('dl') as HTMLElement;
    expect(within(strip).getAllByRole('definition').at(-1)).toHaveTextContent('1019hPa');
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
        favoriteMetrics={DEFAULT_FAVORITE_METRICS}
        onRefresh={() => {}}
        isRefreshing={false}
        isStale
        failureMessage="Couldn't reach the weather service."
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/showing the last reading that loaded/i);
    expect(screen.getByRole('heading', { level: 3, name: 'Partly Cloudy Afternoon' })).toBeInTheDocument();
  });

  it('offers a retry when there is no reading at all', () => {
    const onRefresh = vi.fn();
    render(
      <Hero
        location={DEFAULT_LOCATION}
        isLoading={false}
        errorMessage="The weather service is having trouble."
        unitSystem="imperial"
        favoriteMetrics={DEFAULT_FAVORITE_METRICS}
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
