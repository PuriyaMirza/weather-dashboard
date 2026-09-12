import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';

/**
 * Getting in and out of arrange mode.
 *
 * Until now the menu was the only door in both directions: enter, dismiss the menu, arrange, then
 * reopen the menu to leave. These cover the doors that replaced it, and — just as importantly —
 * that the new Escape handling does not trample the dialogs, which own Escape while they are open.
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

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
  return screen.getByRole('dialog', { name: /dashboard settings/i });
}

function enterArrangeMode() {
  const menu = openMenu();
  fireEvent.click(within(menu).getByRole('button', { name: /arrange modules/i }));
}

const toolbar = () => screen.queryByRole('group', { name: /arranging modules/i });

describe('entering arrange mode', () => {
  it('dismisses the menu instead of leaving it covering the modules being arranged', () => {
    render(<Dashboard />);
    enterArrangeMode();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toolbar()).toBeInTheDocument();
    expect(useDashboardStore.getState().isEditing).toBe(true);
  });

  it('moves focus to the toolbar, so the mode is announced and the next Tab is on a module', () => {
    render(<Dashboard />);
    enterArrangeMode();

    expect(screen.getByRole('button', { name: /^done$/i })).toHaveFocus();
  });

  it('describes the Done button with the hint rather than making the bar a live region', () => {
    render(<Dashboard />);
    enterArrangeMode();

    // A role="status" wrapping the button would re-announce it on every render.
    expect(screen.getByRole('button', { name: /^done$/i })).toHaveAccessibleDescription(
      /drag a module by its handle/i,
    );
  });
});

describe('leaving arrange mode', () => {
  it('exits from the toolbar Done button, without a trip back through the menu', () => {
    render(<Dashboard />);
    enterArrangeMode();

    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    expect(toolbar()).not.toBeInTheDocument();
    expect(useDashboardStore.getState().isEditing).toBe(false);
    expect(screen.queryByRole('button', { name: /^move /i })).not.toBeInTheDocument();
  });

  it('exits on Escape from anywhere on the page', () => {
    render(<Dashboard />);
    enterArrangeMode();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(toolbar()).not.toBeInTheDocument();
    expect(useDashboardStore.getState().isEditing).toBe(false);
  });

  it('returns focus to the hamburger, which is where arranging was started from', () => {
    render(<Dashboard />);
    enterArrangeMode();

    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    expect(screen.getByRole('button', { name: /open menu/i })).toHaveFocus();
  });

  it('still exits from the menu toggle, which keeps reading as a pressed toggle', () => {
    render(<Dashboard />);
    enterArrangeMode();

    const menu = openMenu();
    const toggle = within(menu).getByRole('button', { name: /done arranging/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(useDashboardStore.getState().isEditing).toBe(false);
  });
});

describe('Escape while a dialog is open', () => {
  it('closes the menu only, leaving arrange mode on', () => {
    render(<Dashboard />);
    enterArrangeMode();
    openMenu();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The dialog owns Escape while it is open; one keystroke must not also drop the mode behind it.
    expect(useDashboardStore.getState().isEditing).toBe(true);
    expect(toolbar()).toBeInTheDocument();
  });

  it('closes the location panel only, leaving arrange mode on', () => {
    render(<Dashboard />);
    enterArrangeMode();
    fireEvent.click(screen.getByRole('button', { name: /change location/i }));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useDashboardStore.getState().isEditing).toBe(true);
  });
});
