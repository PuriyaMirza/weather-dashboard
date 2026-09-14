import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';

/**
 * Reordering by tapping, which exists because dragging is a demanding gesture on a phone.
 *
 * The point of this path is that it is ordinary clicks — no hold, no pointer travel, no gesture
 * racing the scroller — so unlike the drag it can actually be asserted here and in every browser
 * the e2e suite runs.
 */

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

function enterArrangeMode() {
  fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
  const menu = screen.getByRole('dialog', { name: /dashboard settings/i });
  fireEvent.click(within(menu).getByRole('button', { name: /arrange modules/i }));
}

/** The handle of a given module, which doubles as the pick-up control. */
function handleFor(title: string) {
  return screen.getByRole('button', { name: new RegExp(`^reorder ${title}`, 'i') });
}

function order() {
  return useDashboardStore.getState().cards.map((card) => card.id);
}

describe('picking a module up', () => {
  it('offers every other module as a destination, and not itself', () => {
    render(<Dashboard />);
    enterArrangeMode();
    fireEvent.click(handleFor('Rain Chance'));

    const targets = screen.getAllByRole('button', { name: /move rain chance to position/i });
    // Every module except the one in hand.
    expect(targets).toHaveLength(DEFAULT_CARD_LAYOUT.length - 1);
  });

  it('says what is in hand, and offers a way to put it back', () => {
    render(<Dashboard />);
    enterArrangeMode();
    fireEvent.click(handleFor('Rain Chance'));

    expect(screen.getByText(/placing rain chance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    // Done would be ambiguous mid-placement, so it steps aside until the module is put down.
    expect(screen.queryByRole('button', { name: /^done$/i })).not.toBeInTheDocument();
  });

  it('marks the handle as pressed, so the state is not carried by an outline alone', () => {
    render(<Dashboard />);
    enterArrangeMode();
    fireEvent.click(handleFor('Rain Chance'));

    expect(screen.getByRole('button', { name: /cancel moving rain chance/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('putting it down', () => {
  it('moves the module to the tapped slot and persists the new order', () => {
    render(<Dashboard />);
    enterArrangeMode();
    const before = order();

    fireEvent.click(handleFor('Rain Chance'));
    // Humidity sits at index 3 in the default layout; Rain Chance should land there.
    fireEvent.click(screen.getByRole('button', { name: /move rain chance to position 4 of 5/i }));

    const after = order();
    expect(after).not.toEqual(before);
    expect(after.indexOf('precipitation-chance')).toBe(3);
    // And it reached the store, not just the DOM.
    expect(useDashboardStore.getState().cards[3].id).toBe('precipitation-chance');
  });

  it('clears the placement state once placed', () => {
    render(<Dashboard />);
    enterArrangeMode();

    fireEvent.click(handleFor('Rain Chance'));
    fireEvent.click(screen.getByRole('button', { name: /move rain chance to position 4 of 5/i }));

    expect(screen.queryByText(/placing/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument();
  });

  it('announces the result, which is otherwise only visible as an outline moving', () => {
    render(<Dashboard />);
    enterArrangeMode();

    fireEvent.click(handleFor('Rain Chance'));
    expect(screen.getByText(/moving rain chance\. choose where it goes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /move rain chance to position 4 of 5/i }));
    expect(screen.getByText(/rain chance moved to position 4 of 5/i)).toBeInTheDocument();
  });
});

describe('changing your mind', () => {
  it('puts the module back when its own handle is tapped again', () => {
    render(<Dashboard />);
    enterArrangeMode();
    const before = order();

    fireEvent.click(handleFor('Rain Chance'));
    fireEvent.click(screen.getByRole('button', { name: /cancel moving rain chance/i }));

    expect(screen.queryByText(/placing/i)).not.toBeInTheDocument();
    expect(order()).toEqual(before);
  });

  it('puts the module back from the toolbar Cancel', () => {
    render(<Dashboard />);
    enterArrangeMode();
    const before = order();

    fireEvent.click(handleFor('Rain Chance'));
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByText(/placing/i)).not.toBeInTheDocument();
    expect(order()).toEqual(before);
  });

  it('unwinds one layer at a time on Escape: the module first, arrange mode second', () => {
    render(<Dashboard />);
    enterArrangeMode();

    fireEvent.click(handleFor('Rain Chance'));
    fireEvent.keyDown(document, { key: 'Escape' });

    // The module is put back, but we are still arranging.
    expect(screen.queryByText(/placing/i)).not.toBeInTheDocument();
    expect(useDashboardStore.getState().isEditing).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useDashboardStore.getState().isEditing).toBe(false);
  });

  it('drops a pending placement when arrange mode ends', () => {
    render(<Dashboard />);
    enterArrangeMode();

    fireEvent.click(handleFor('Rain Chance'));
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    // Re-entering must not resume a half-finished move from last time.
    enterArrangeMode();
    expect(screen.queryByText(/placing/i)).not.toBeInTheDocument();
  });
});
