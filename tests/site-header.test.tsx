import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SiteHeader, formatUpdated } from '@/components/dashboard/site-header';
import { DEFAULT_LOCATION } from '@/lib/weather/location';

function renderHeader(overrides: Partial<Parameters<typeof SiteHeader>[0]> = {}) {
  const props = {
    location: DEFAULT_LOCATION,
    hasHydrated: true,
    updatedAt: new Date().toISOString(),
    timeZone: 'America/Los_Angeles',
    isStale: false,
    onRefresh: vi.fn(),
    isRefreshing: false,
    onOpenLocationPanel: vi.fn(),
    locationButtonRef: createRef<HTMLButtonElement>(),
    onCompare: vi.fn(),
    compareButtonRef: createRef<HTMLButtonElement>(),
    menu: <button type="button">Open menu</button>,
    ...overrides,
  };
  render(<SiteHeader {...props} />);
  return props;
}

describe('SiteHeader', () => {
  it('titles the page "Weather" for assistive tech', () => {
    renderHeader();
    expect(screen.getByRole('heading', { level: 1, name: 'Weather' })).toBeInTheDocument();
  });

  it('shows the place and opens the location dialog from it', () => {
    const props = renderHeader();
    const button = screen.getByRole('button', { name: /change location.*portland, oregon, united states/i });
    expect(button).toHaveTextContent('Portland');
    expect(props.locationButtonRef.current).toBe(button);

    fireEvent.click(button);
    expect(props.onOpenLocationPanel).toHaveBeenCalled();
  });

  it('labels a fresh reading Live, in words rather than colour alone', () => {
    renderHeader();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('flags a stale reading', () => {
    renderHeader({ isStale: true });
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
  });

  it('shows no status before any reading has loaded', () => {
    renderHeader({ updatedAt: undefined });
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.queryByText(/updated/i)).toBeNull();
  });

  it('refreshes from a button named exactly Refresh', () => {
    const props = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables Refresh while a refresh is in flight', () => {
    renderHeader({ isRefreshing: true });
    expect(screen.getByRole('button', { name: /^refresh$/i })).toBeDisabled();
  });

  it('holds a placeholder instead of the location button until preferences load', () => {
    renderHeader({ hasHydrated: false });
    expect(screen.queryByRole('button', { name: /change location/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^refresh$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^compare$/i })).toBeNull();
  });

  it('opens Compare from a button named Compare, with the word in its text as well as its icon', () => {
    const props = renderHeader();
    const button = screen.getByRole('button', { name: /^compare$/i });
    expect(button).toHaveTextContent('Compare');
    expect(props.compareButtonRef.current).toBe(button);

    fireEvent.click(button);
    expect(props.onCompare).toHaveBeenCalledTimes(1);
  });
});

describe('formatUpdated', () => {
  const updatedAt = '2026-07-18T15:05:00-07:00';
  const at = (minutesLater: number) => Date.parse(updatedAt) + minutesLater * 60_000;

  it('counts minutes for the first hour', () => {
    expect(formatUpdated(updatedAt, at(0))).toBe('Updated just now');
    expect(formatUpdated(updatedAt, at(12))).toBe('Updated 12 min ago');
  });

  it('switches to the clock time, in the location zone, after an hour', () => {
    expect(formatUpdated(updatedAt, at(90), 'America/Los_Angeles')).toBe('Updated 3:05 PM');
  });

  it('never reports a negative age', () => {
    expect(formatUpdated(updatedAt, at(-2))).toBe('Updated just now');
  });

  it('says nothing about an unreadable timestamp', () => {
    expect(formatUpdated('nonsense', at(0))).toBe('');
  });
});
