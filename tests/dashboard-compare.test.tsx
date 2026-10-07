import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';

const LISBON: SelectedLocation = {
  id: '2267057',
  name: 'Lisbon',
  region: 'Lisbon',
  country: 'Portugal',
  latitude: 38.7167,
  longitude: -9.1333,
};

// Entering and leaving the view is what is under test, not the readings, so every request fails;
// the view still renders both places in their error state.
beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'stubbed' }), { status: 502 })),
  );
  useDashboardStore.setState({
    location: DEFAULT_LOCATION,
    savedLocations: [DEFAULT_LOCATION, LISBON],
    unitSystem: 'imperial',
    cards: DEFAULT_CARD_LAYOUT,
    isEditing: false,
    isComparing: false,
    compareLocation: null,
    hasOnboarded: true,
  });
});

function openCompare() {
  fireEvent.click(screen.getByRole('button', { name: /^compare$/i }));
}

describe('Compare in the dashboard', () => {
  it('replaces the hero and card grid with the Compare view, focused on its heading', () => {
    render(<Dashboard />);
    expect(screen.getByLabelText('Weather modules')).toBeInTheDocument();

    openCompare();

    expect(screen.getByRole('heading', { level: 2, name: 'Compare' })).toHaveFocus();
    expect(screen.queryByLabelText('Weather modules')).toBeNull();
    expect(screen.getByRole('heading', { name: /pick a place to compare with/i })).toBeInTheDocument();
  });

  it('fetches the compared place only once one is picked, while the view is open', async () => {
    render(<Dashboard />);
    const fetchMock = vi.mocked(fetch);
    const lisbonRequests = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('latitude=38.7167'));

    openCompare();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /compare with lisbon/i }));
    });

    expect(useDashboardStore.getState().compareLocation).toEqual(LISBON);
    expect(screen.getByRole('article', { name: 'Lisbon' })).toBeInTheDocument();
    expect(lisbonRequests()).toHaveLength(1);
  });

  it('returns to the grid on Done, with focus back on the header’s Compare button', () => {
    render(<Dashboard />);
    openCompare();

    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    expect(screen.getByLabelText('Weather modules')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Compare' })).toBeNull();
    expect(screen.getByRole('button', { name: /^compare$/i })).toHaveFocus();
  });

  it('returns to the grid on Escape, with focus back on the Compare button', () => {
    render(<Dashboard />);
    openCompare();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByLabelText('Weather modules')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^compare$/i })).toHaveFocus();
  });

  it('spends Escape on the open picker first, leaving the view open', () => {
    render(<Dashboard />);
    openCompare();
    const choose = screen.getByRole('button', { name: /choose a place/i });
    fireEvent.click(choose);
    expect(screen.getByRole('dialog', { name: 'Compare with…' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Compare with…' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Compare' })).toBeInTheDocument();
    expect(choose).toHaveFocus();
  });

  it('remembers the pair and layout but not that the view was open', () => {
    render(<Dashboard />);
    openCompare();
    act(() => {
      useDashboardStore.getState().setCompareLocation(LISBON);
      useDashboardStore.getState().setCompareLayout('side-by-side');
    });

    const persisted = JSON.parse(window.localStorage.getItem('weather-dashboard') ?? '{}').state;
    expect(persisted.compareLocation).toEqual(LISBON);
    expect(persisted.compareLayout).toBe('side-by-side');
    expect(persisted).not.toHaveProperty('isComparing');
  });
});
