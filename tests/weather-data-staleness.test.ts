import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWeatherData } from '@/lib/hooks/use-weather-data';
import { DEFAULT_LOCATION } from '@/lib/weather/location';
import { mockWeatherData } from '@/lib/weather/mock-data';

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

/**
 * jsdom's `document.visibilityState` is a read-only getter with no built-in way to change it, so
 * the transition is simulated the same way a real browser reports one: the property changes, then
 * the event that announces the change fires.
 */
function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useWeatherData — refetching a tab that sat in the background', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('refetches once the tab returns to the foreground past the staleness threshold, but not before', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(mockWeatherData));
    vi.stubGlobal('fetch', fetchMock);
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);

    const { result } = renderHook(() => useWeatherData(DEFAULT_LOCATION));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Nine minutes on a background tab, then back to the foreground: still under the ten-minute
    // threshold, so this must be silent.
    now.mockReturnValue(9 * 60 * 1000);
    act(() => setVisibility('hidden'));
    act(() => setVisibility('visible'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Two minutes later — eleven minutes since the original fetch — the same transition now
    // crosses the threshold and triggers a silent refetch.
    now.mockReturnValue(11 * 60 * 1000);
    act(() => setVisibility('hidden'));
    act(() => setVisibility('visible'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('does not refetch while the tab stays in the background, however long it sits there', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(mockWeatherData));
    vi.stubGlobal('fetch', fetchMock);
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);

    const { result } = renderHook(() => useWeatherData(DEFAULT_LOCATION));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    now.mockReturnValue(60 * 60 * 1000);
    act(() => setVisibility('hidden'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not refetch while a refresh is already in flight', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(mockWeatherData));
    vi.stubGlobal('fetch', fetchMock);
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);

    const { result } = renderHook(() => useWeatherData(DEFAULT_LOCATION));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    now.mockReturnValue(11 * 60 * 1000);
    act(() => result.current.refresh());
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // A visibility change arriving while that refresh is still outstanding must not pile on a
    // third request.
    act(() => setVisibility('hidden'));
    act(() => setVisibility('visible'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
