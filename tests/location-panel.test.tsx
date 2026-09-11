import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';

// The dashboard fetches weather on mount; every test here is about the location dialog, so the
// request is stubbed to a permanent error state — the hero still renders its location button
// regardless of whether the forecast itself loaded.
function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'stubbed' }), { status: 502 })),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  stubFetch();
  useDashboardStore.setState({
    location: DEFAULT_LOCATION,
    savedLocations: [],
    unitSystem: 'imperial',
    cards: DEFAULT_CARD_LAYOUT,
    isEditing: false,
    hasOnboarded: true,
  });
});

function openLocationPanel() {
  fireEvent.click(screen.getByRole('button', { name: /change location/i }));
  return screen.getByRole('dialog', { name: /change location/i });
}

describe('the location panel', () => {
  it('is closed until the location button is pressed, and names the current location', () => {
    render(<Dashboard />);

    const trigger = screen.getByRole('button', { name: /change location.*portland, oregon, united states/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a labelled dialog containing the search box, and closes on Escape', () => {
    render(<Dashboard />);
    const panel = openLocationPanel();

    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('combobox', { name: /search for a city or postal code/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the location button when it closes, rather than dropping it at the top of the page', () => {
    render(<Dashboard />);
    openLocationPanel();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /change location/i })).toHaveFocus();
  });

  it('closes on picking a location from the saved-location chips, not just on Escape', () => {
    useDashboardStore.setState({
      savedLocations: [{ id: 'seattle', name: 'Seattle', region: 'Washington', country: 'United States', latitude: 47.6, longitude: -122.3 }],
    });
    render(<Dashboard />);
    openLocationPanel();

    fireEvent.click(screen.getByRole('button', { name: /show weather for seattle/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useDashboardStore.getState().location.name).toBe('Seattle');
    // Focus returns to the trigger like any other close, so a keyboard user isn't dropped.
    expect(screen.getByRole('button', { name: /change location/i })).toHaveFocus();
  });

  it('offers a Close button as well as Escape', () => {
    render(<Dashboard />);
    const panel = openLocationPanel();

    fireEvent.click(within(panel).getByRole('button', { name: /^close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
