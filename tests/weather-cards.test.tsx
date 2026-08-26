import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { weatherCardRegistry } from '@/components/weather/card-registry';
import { mockWeatherData } from '@/lib/weather/mock-data';
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
  it('renders one row per forecast day as a real table', () => {
    const DailyForecast = cardComponent('daily-forecast');
    render(<DailyForecast data={mockWeatherData} unitSystem="imperial" />);

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(mockWeatherData.daily.length + 1);
    expect(within(table).getByRole('rowheader', { name: 'Sat' })).toBeInTheDocument();
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
