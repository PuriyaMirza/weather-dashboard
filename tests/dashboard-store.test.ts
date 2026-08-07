import { beforeEach, describe, expect, it } from 'vitest';
import { DASHBOARD_STORAGE_KEY, useDashboardStore } from '@/store/dashboard-store';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';

const SEATTLE: SelectedLocation = {
  id: '5809844',
  name: 'Seattle',
  region: 'Washington',
  country: 'United States',
  latitude: 47.60621,
  longitude: -122.33207,
};

beforeEach(() => {
  window.localStorage.clear();
  useDashboardStore.setState({ location: DEFAULT_LOCATION });
});

describe('dashboard store', () => {
  it('starts on the default location', () => {
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);
  });

  it('sets and resets the selected location', () => {
    useDashboardStore.getState().setLocation(SEATTLE);
    expect(useDashboardStore.getState().location).toEqual(SEATTLE);

    useDashboardStore.getState().resetLocation();
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);
  });

  it('persists the location to storage, and only the location', () => {
    useDashboardStore.getState().setLocation(SEATTLE);

    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const persisted = JSON.parse(raw as string);
    expect(persisted.state.location).toEqual(SEATTLE);
    // partialize should keep actions out of storage.
    expect(persisted.state.setLocation).toBeUndefined();
    expect(persisted.version).toBe(1);
  });

  it('does not read persisted state until rehydrate is called (skipHydration)', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: SEATTLE }, version: 1 }),
    );

    // Nothing has rehydrated yet, so the store still holds its initial state — this is what keeps
    // the first client render identical to the server-rendered HTML.
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().location).toEqual(SEATTLE);
  });

  it('discards persisted state saved under an older version', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: SEATTLE }, version: 0 }),
    );

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);
  });
});
