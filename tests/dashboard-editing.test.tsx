import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { weatherCardRegistry } from '@/components/weather/card-registry';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';

// The dashboard fetches weather on mount; every test here is about layout editing, so the request
// is stubbed to a permanent error state. Modules then render their error state, which is enough
// for the edit affordances to be present and exercised.
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
    // These suites are about the dashboard a returning visitor sees; without this the
    // first-run flow renders over it and every query finds the onboarding dialog instead.
    hasOnboarded: true,
  });
});

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
  return screen.getByRole('dialog', { name: /dashboard settings/i });
}

function enterEditMode() {
  const menu = openMenu();
  fireEvent.click(within(menu).getByRole('button', { name: /arrange modules/i }));
  fireEvent.keyDown(document, { key: 'Escape' });
}

describe('the menu', () => {
  it('is closed until the hamburger is pressed, and says so', () => {
    render(<Dashboard />);

    const trigger = screen.getByRole('button', { name: /open menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a labelled dialog and closes again on Escape', () => {
    render(<Dashboard />);
    const menu = openMenu();

    expect(menu).toHaveAttribute('aria-modal', 'true');
    // The hamburger itself relabels; the panel carries its own dismiss control too.
    expect(screen.getByRole('button', { name: /close menu/i, expanded: true })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /close menu/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the hamburger when it closes, rather than dropping it at the top of the page', () => {
    render(<Dashboard />);
    openMenu();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveFocus();
  });
});

describe('the module toggle list', () => {
  it('offers every module in the registry as a checkbox', () => {
    render(<Dashboard />);
    const menu = openMenu();

    // Derived from the registry rather than hardcoded, so a module added later is covered here
    // automatically instead of silently escaping the menu.
    for (const card of weatherCardRegistry) {
      // Exact names, because several titles are prefixes of others ("Temperature" / "Hourly
      // Temperature", "Wind" / "Wind Detail") — a loose match would pass on the wrong element.
      expect(within(menu).getByRole('checkbox', { name: card.title })).toBeInTheDocument();
    }
  });

  it('reflects which modules are on the dashboard', () => {
    render(<Dashboard />);
    const menu = openMenu();

    expect(within(menu).getByRole('checkbox', { name: 'Humidity' })).toBeChecked();
    // Comfort is a panel that the default layout deliberately leaves off.
    expect(within(menu).getByRole('checkbox', { name: 'Comfort' })).not.toBeChecked();
  });

  it('adds a module when switched on and removes it when switched off', () => {
    render(<Dashboard />);
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole('checkbox', { name: 'Dew Point' }));
    expect(useDashboardStore.getState().cards.map((card) => card.id)).toContain('dew-point');

    fireEvent.click(within(menu).getByRole('checkbox', { name: 'Dew Point' }));
    expect(useDashboardStore.getState().cards.map((card) => card.id)).not.toContain('dew-point');
  });

  it('shows a helpful empty state rather than a blank page when every module is switched off', () => {
    render(<Dashboard />);

    act(() => {
      for (const entry of [...useDashboardStore.getState().cards]) {
        useDashboardStore.getState().removeCard(entry.id);
      }
    });

    expect(screen.getByText(/your dashboard is empty/i)).toBeInTheDocument();
  });
});

describe('edit mode', () => {
  it('is off by default, exposing no per-module controls', () => {
    render(<Dashboard />);

    expect(screen.queryByRole('button', { name: /^move /i })).not.toBeInTheDocument();
  });

  it('reveals the per-module controls when turned on', () => {
    render(<Dashboard />);
    enterEditMode();

    expect(screen.getAllByRole('button', { name: /^move .* earlier$/i }).length).toBeGreaterThan(0);
  });
});

describe('reordering without a pointer', () => {
  it('offers move earlier and later buttons for every module, naming the module', () => {
    render(<Dashboard />);
    enterEditMode();

    // Drag is never the only route: each module has explicit, labelled move buttons.
    expect(screen.getAllByRole('button', { name: /^move .* earlier$/i })).toHaveLength(DEFAULT_CARD_LAYOUT.length);
    expect(screen.getAllByRole('button', { name: /^move .* later$/i })).toHaveLength(DEFAULT_CARD_LAYOUT.length);
  });

  it('moves a module earlier with its move button', () => {
    render(<Dashboard />);
    enterEditMode();

    const before = useDashboardStore.getState().cards.map((card) => card.id);
    fireEvent.click(screen.getByRole('button', { name: /^move humidity earlier$/i }));

    const after = useDashboardStore.getState().cards.map((card) => card.id);
    expect(after.indexOf('humidity')).toBe(before.indexOf('humidity') - 1);
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
    expect(handles[0]).toHaveAccessibleName(new RegExp(`position 1 of ${DEFAULT_CARD_LAYOUT.length}`, 'i'));
    expect(handles[0]).toHaveAccessibleName(/arrow keys/i);
  });
});

describe('removing a module from the grid', () => {
  it('removes it from the layout', () => {
    render(<Dashboard />);
    enterEditMode();

    fireEvent.click(screen.getByRole('button', { name: /remove humidity from the dashboard/i }));

    expect(useDashboardStore.getState().cards.map((card) => card.id)).not.toContain('humidity');
  });
});

describe('module size', () => {
  it('offers small, medium and large as a radio group, with the current size checked', () => {
    render(<Dashboard />);
    enterEditMode();

    const group = screen.getByRole('radiogroup', { name: /size of humidity/i });
    expect(within(group).getByRole('radio', { name: /small humidity/i })).toBeChecked();
    expect(within(group).getByRole('radio', { name: /large humidity/i })).not.toBeChecked();
  });

  it('changes the size when another is chosen', () => {
    render(<Dashboard />);
    enterEditMode();

    const group = screen.getByRole('radiogroup', { name: /size of humidity/i });
    fireEvent.click(within(group).getByRole('radio', { name: /large humidity/i }));

    expect(useDashboardStore.getState().cards.find((card) => card.id === 'humidity')?.size).toBe('large');
    expect(within(group).getByRole('radio', { name: /large humidity/i })).toBeChecked();
  });
});

describe('presets and defaults', () => {
  it('applies a preset from the menu', () => {
    render(<Dashboard />);
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole('button', { name: /apply the cyclist preset/i }));

    expect(useDashboardStore.getState().cards.map((card) => card.id)).toContain('wind-speed');
  });

  it('puts the layout back after edits', () => {
    render(<Dashboard />);
    const menu = openMenu();

    act(() => {
      useDashboardStore.getState().removeCard('humidity');
      useDashboardStore.getState().addCard('pressure');
    });

    fireEvent.click(within(menu).getByRole('button', { name: /restore defaults/i }));

    expect(useDashboardStore.getState().cards).toEqual(DEFAULT_CARD_LAYOUT);
  });
});
