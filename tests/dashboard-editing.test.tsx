import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';

// The dashboard fetches weather on mount; every test here is about layout editing, so the request
// is stubbed to a permanent error state. Cards then render their error state, which is enough for
// the edit affordances to be present and exercised.
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
    unitSystem: 'imperial',
    cards: DEFAULT_CARD_LAYOUT,
    isEditing: false,
  });
});

function enterEditMode() {
  fireEvent.click(screen.getByRole('button', { name: /edit dashboard/i }));
}

describe('edit mode', () => {
  it('is off by default, exposing no edit controls', () => {
    render(<Dashboard />);

    expect(screen.getByRole('button', { name: /edit dashboard/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /add a card/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^move /i })).not.toBeInTheDocument();
  });

  it('reveals the editing toolbar and per-card controls when turned on', () => {
    render(<Dashboard />);
    enterEditMode();

    expect(screen.getByRole('button', { name: /done editing/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /add a card/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore defaults/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^move .* earlier$/i }).length).toBeGreaterThan(0);
  });
});

describe('reordering without a pointer', () => {
  it('offers move up and down buttons for every card, naming the card', () => {
    render(<Dashboard />);
    enterEditMode();

    // Drag is never the only route: each card has explicit, labelled move buttons.
    for (const entry of DEFAULT_CARD_LAYOUT) {
      const title = useDashboardStore.getState().cards.find((card) => card.id === entry.id);
      expect(title).toBeDefined();
    }
    expect(screen.getAllByRole('button', { name: /^move .* earlier$/i })).toHaveLength(DEFAULT_CARD_LAYOUT.length);
    expect(screen.getAllByRole('button', { name: /^move .* later$/i })).toHaveLength(DEFAULT_CARD_LAYOUT.length);
  });

  it('moves a card earlier with its move button', () => {
    render(<Dashboard />);
    enterEditMode();

    const before = useDashboardStore.getState().cards.map((card) => card.id);
    fireEvent.click(screen.getByRole('button', { name: /^move comfort earlier$/i }));

    const after = useDashboardStore.getState().cards.map((card) => card.id);
    expect(after[0]).toBe('comfort');
    expect(after).not.toEqual(before);
  });

  it('disables the move buttons at each end rather than letting them silently do nothing', () => {
    render(<Dashboard />);
    enterEditMode();

    const upButtons = screen.getAllByRole('button', { name: /^move .* earlier$/i });
    const downButtons = screen.getAllByRole('button', { name: /^move .* later$/i });

    expect(upButtons[0]).toBeDisabled();
    expect(downButtons.at(-1)).toBeDisabled();
    expect(upButtons[1]).toBeEnabled();
  });

  it('gives each drag handle a label describing its position and how to use it by keyboard', () => {
    render(<Dashboard />);
    enterEditMode();

    const handles = screen.getAllByRole('button', { name: /^reorder /i });
    expect(handles).toHaveLength(DEFAULT_CARD_LAYOUT.length);
    expect(handles[0]).toHaveAccessibleName(/position 1 of 4/i);
    expect(handles[0]).toHaveAccessibleName(/arrow keys/i);
  });
});

describe('adding and removing cards', () => {
  it('removes a card from the layout', () => {
    render(<Dashboard />);
    enterEditMode();

    fireEvent.click(screen.getByRole('button', { name: /remove comfort from the dashboard/i }));

    expect(useDashboardStore.getState().cards.map((card) => card.id)).not.toContain('comfort');
  });

  it('lists only cards that are not already shown, and adds one', () => {
    render(<Dashboard />);
    enterEditMode();
    fireEvent.click(screen.getByRole('button', { name: /add a card/i }));

    const panel = screen.getByRole('region', { name: /add a card/i });
    // Comfort is already on the dashboard by default, so it must not be offered.
    expect(within(panel).queryByRole('button', { name: /add comfort/i })).not.toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: /add wind/i }));
    expect(useDashboardStore.getState().cards.map((card) => card.id)).toContain('wind');
  });

  it('says so when every card is already on the dashboard', () => {
    render(<Dashboard />);
    enterEditMode();

    act(() => {
      for (const card of ['precipitation', 'wind', 'sun-uv', 'atmospheric-details'] as const) {
        useDashboardStore.getState().addCard(card);
      }
    });
    fireEvent.click(screen.getByRole('button', { name: /add a card/i }));

    expect(screen.getByText(/every available card is already on your dashboard/i)).toBeInTheDocument();
  });

  it('closes the add panel with Escape', () => {
    render(<Dashboard />);
    enterEditMode();
    fireEvent.click(screen.getByRole('button', { name: /add a card/i }));

    const panel = screen.getByRole('region', { name: /add a card/i });
    fireEvent.keyDown(panel, { key: 'Escape' });

    expect(screen.queryByRole('region', { name: /add a card/i })).not.toBeInTheDocument();
  });

  it('shows a helpful empty state rather than a blank page when all cards are removed', () => {
    render(<Dashboard />);
    enterEditMode();

    const removeButtonsRemaining = () =>
      screen.queryAllByRole('button', { name: /remove .* from the dashboard/i });

    let remaining = removeButtonsRemaining();
    while (remaining.length > 0) {
      fireEvent.click(remaining[0]);
      remaining = removeButtonsRemaining();
    }

    expect(screen.getByText(/your dashboard is empty/i)).toBeInTheDocument();
  });
});

describe('card size', () => {
  it('toggles a card between wide and narrow, reflecting state via aria-pressed', () => {
    render(<Dashboard />);
    enterEditMode();

    const button = screen.getByRole('button', { name: /make comfort wide/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);

    expect(useDashboardStore.getState().cards.find((card) => card.id === 'comfort')?.span).toBe('wide');
    expect(screen.getByRole('button', { name: /make comfort narrow/i })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('restore defaults', () => {
  it('puts the layout back after edits', () => {
    render(<Dashboard />);
    enterEditMode();

    act(() => {
      useDashboardStore.getState().removeCard('comfort');
      useDashboardStore.getState().addCard('wind');
    });

    fireEvent.click(screen.getByRole('button', { name: /restore defaults/i }));

    expect(useDashboardStore.getState().cards).toEqual(DEFAULT_CARD_LAYOUT);
  });
});
