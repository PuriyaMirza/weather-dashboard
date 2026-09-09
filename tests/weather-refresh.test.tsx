import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { mockWeatherData } from '@/lib/weather/mock-data';
import { useDashboardStore } from '@/store/dashboard-store';

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function fail(message: string, status = 502) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  window.localStorage.clear();
  useDashboardStore.setState({
    location: DEFAULT_LOCATION,
    unitSystem: 'imperial',
    cards: DEFAULT_CARD_LAYOUT,
    isEditing: false,
  });
});

describe('refreshing', () => {
  it('re-requests the forecast when Refresh is pressed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(mockWeatherData));
    vi.stubGlobal('fetch', fetchMock);

    render(<Dashboard />);
    await screen.findByRole('button', { name: /^refresh$/i });

    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  /**
   * A refresh hits the same URL as the load that preceded it, so without an explicit no-store the
   * browser or CDN can answer from cache and the button appears to do nothing.
   */
  it('bypasses the cache on a refresh, but not on the first load', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(mockWeatherData));
    vi.stubGlobal('fetch', fetchMock);

    render(<Dashboard />);
    await screen.findByRole('button', { name: /^refresh$/i });

    const firstInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(firstInit.cache).toBe('default');

    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }));

    await waitFor(() => {
      const latest = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
      expect(latest.cache).toBe('no-store');
    });
  });

  it('offers Try again when the first load fails, and recovers when it succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fail('The weather service is having trouble right now.'))
      .mockResolvedValue(ok(mockWeatherData));
    vi.stubGlobal('fetch', fetchMock);

    render(<Dashboard />);

    const retry = await screen.findByRole('button', { name: /try again/i });
    expect(screen.getByRole('alert')).toHaveTextContent(/having trouble/i);

    fireEvent.click(retry);

    // Recovery means the modules render real readings again, not just that the message vanished.
    await waitFor(() => expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument());
    // Several modules legitimately render the condition, so assert at least one, not exactly one.
    expect(await screen.findAllByText('Partly cloudy')).not.toHaveLength(0);
  });
});

describe('a failed refresh over a good reading', () => {
  /**
   * The important behaviour: one transient blip must not wipe a working dashboard. The reading
   * stays, labelled as old, rather than every module flipping to an error.
   */
  it('keeps the last good reading on screen and says it is stale', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(mockWeatherData))
      .mockResolvedValue(fail("Couldn't reach the weather service."));
    vi.stubGlobal('fetch', fetchMock);

    render(<Dashboard />);
    // Several modules legitimately render the condition, so assert at least one, not exactly one.
    expect(await screen.findAllByText('Partly cloudy')).not.toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }));

    await waitFor(() => expect(screen.getByText(/showing the last reading that loaded/i)).toBeInTheDocument());

    // The reading survived, and no module was replaced by an error.
    expect(screen.getAllByText('Partly cloudy')).not.toHaveLength(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * Stale data lives in memory only. A fresh page load that fails has nothing to fall back on and
   * must say so — showing a reading recovered from storage could be arbitrarily old.
   */
  it('does not fall back to stale data on a failed first load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail('The weather service is having trouble.')));

    render(<Dashboard />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/showing the last reading that loaded/i)).not.toBeInTheDocument();
  });
});
