import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { DEFAULT_CARD_LAYOUT, type CardLayoutEntry } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION, coordinatesToLocation } from '@/lib/weather/location';
import { mockWeekWeatherData } from '@/lib/weather/mock-data';
import { useDashboardStore } from '@/store/dashboard-store';

/**
 * The day picker, as the dashboard wires it: which modules follow it, which never do, and when the
 * choice is let go of. The fixture's today is Saturday 2026-07-18; Sunday is clear, Monday rains.
 */

/** Two day-following modules beside two that describe the present, which must never follow. */
const PLANNING_LAYOUT: CardLayoutEntry[] = [
  { id: 'hourly-temperature', size: 'large' },
  { id: 'precipitation', size: 'medium' },
  { id: 'humidity', size: 'small' },
  { id: 'daily-forecast', size: 'large' },
];

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function stubForecast(...bodies: unknown[]) {
  const fetchMock = vi.fn();
  for (const body of bodies) fetchMock.mockResolvedValueOnce(ok(body));
  fetchMock.mockResolvedValue(ok(bodies.at(-1)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
  useDashboardStore.setState({
    location: DEFAULT_LOCATION,
    savedLocations: [],
    unitSystem: 'imperial',
    cards: PLANNING_LAYOUT,
    isEditing: false,
    hasOnboarded: true,
  });
});

const radio = (name: string) => screen.getByRole('radio', { name });

async function renderLoaded() {
  render(<Dashboard />);
  await screen.findByRole('group', { name: 'Plan for' });
}

describe('the day picker on the dashboard', () => {
  it('appears once the forecast has loaded, on today', async () => {
    stubForecast(mockWeekWeatherData);
    render(<Dashboard />);

    expect(screen.queryByRole('group', { name: 'Plan for' })).not.toBeInTheDocument();
    await screen.findByRole('group', { name: 'Plan for' });
    expect(radio('Today')).toBeChecked();
  });

  it('is not offered when nothing on the grid would follow it', async () => {
    stubForecast(mockWeekWeatherData);
    useDashboardStore.setState({ cards: DEFAULT_CARD_LAYOUT.filter((card) => card.id !== 'briefing') });
    render(<Dashboard />);

    await screen.findByText('High of 79°, low of 58°. Sunset at 8:52 PM.');
    expect(screen.queryByRole('group', { name: 'Plan for' })).not.toBeInTheDocument();
  });

  it('is offered on the default layout, which the briefing makes day-following', async () => {
    // The reason the briefing is a default at all: without one day-following module on a new
    // visitor's grid, the week planner never appears for them.
    stubForecast(mockWeekWeatherData);
    useDashboardStore.setState({ cards: DEFAULT_CARD_LAYOUT });
    await renderLoaded();

    fireEvent.click(radio('Monday'));
    expect(screen.getByRole('article', { name: 'Briefing Monday' })).toHaveTextContent('Rain likely all day.');
    // The rest of the default grid describes now or the week, and stays put.
    expect(screen.getByRole('article', { name: 'Next Hours' })).toBeInTheDocument();
  });

  it('re-scopes only the day-following modules when a later day is chosen', async () => {
    stubForecast(mockWeekWeatherData);
    await renderLoaded();

    expect(screen.getByText(/over the next 24 hours\./)).toBeInTheDocument();

    fireEvent.click(radio('Tomorrow'));

    expect(radio('Tomorrow')).toBeChecked();
    expect(screen.getByRole('article', { name: 'Hourly Temperature Sunday' })).toHaveTextContent(
      'Range 60° to 83° on Sunday.',
    );
    expect(screen.getByRole('article', { name: 'Precipitation Sunday' })).toHaveTextContent('Total, Sunday');

    // A reading about now stays now: same value, no day attached to it.
    expect(screen.getByRole('article', { name: 'Humidity' })).toHaveTextContent('54%');
    // The week view is the week view whichever day is picked.
    expect(screen.getByRole('article', { name: 'Daily Forecast' })).toBeInTheDocument();
    // And the hero still describes today.
    expect(screen.getByText('High of 79°, low of 58°. Sunset at 8:52 PM.')).toBeInTheDocument();
  });

  it('goes back to the default view when Today is chosen again', async () => {
    stubForecast(mockWeekWeatherData);
    await renderLoaded();

    fireEvent.click(radio('Monday'));
    expect(screen.getByRole('article', { name: 'Precipitation Monday' })).toBeInTheDocument();

    fireEvent.click(radio('Today'));
    expect(screen.getByRole('article', { name: 'Precipitation' })).toHaveTextContent('Total, next 12h');
    expect(screen.getByText(/over the next 24 hours\./)).toBeInTheDocument();
  });

  it('resets to Today when the location changes', async () => {
    stubForecast(mockWeekWeatherData);
    await renderLoaded();

    fireEvent.click(radio('Monday'));
    expect(radio('Monday')).toBeChecked();

    act(() => useDashboardStore.getState().setLocation(coordinatesToLocation(40.71, -74.01)));

    await waitFor(() => expect(radio('Today')).toBeChecked());
    expect(screen.getByRole('article', { name: 'Hourly Temperature' })).toHaveTextContent(/over the next 24 hours\./);
  });

  it('falls back to Today when a refresh no longer covers the chosen day', async () => {
    const rolledForward = { ...mockWeekWeatherData, daily: mockWeekWeatherData.daily.slice(0, 2) };
    stubForecast(mockWeekWeatherData, rolledForward);
    await renderLoaded();

    fireEvent.click(radio('Monday'));
    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }));

    await waitFor(() => expect(screen.queryByRole('radio', { name: 'Monday' })).not.toBeInTheDocument());
    expect(radio('Today')).toBeChecked();
    expect(screen.getByRole('article', { name: 'Precipitation' })).toHaveTextContent('Total, next 12h');
  });

  it('is never saved with the preferences', async () => {
    stubForecast(mockWeekWeatherData);
    await renderLoaded();

    fireEvent.click(radio('Monday'));

    expect(window.localStorage.getItem('weather-dashboard') ?? '').not.toContain('2026-07-20');
    expect(JSON.stringify(useDashboardStore.getState())).not.toContain('2026-07-20');
  });
});
