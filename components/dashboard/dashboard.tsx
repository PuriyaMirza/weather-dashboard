'use client';

import { useEffect, useState } from 'react';
import { AddCardDrawer } from '@/components/dashboard/add-card-drawer';
import { CardGrid } from '@/components/dashboard/card-grid';
import { Hero } from '@/components/dashboard/hero';
import { LayoutPresets } from '@/components/dashboard/layout-presets';
import { SavedLocations } from '@/components/dashboard/saved-locations';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { UnitToggle } from '@/components/dashboard/unit-toggle';
import { LocationSearch } from '@/components/location/location-search';
import { useHasHydrated } from '@/lib/hooks/use-has-hydrated';
import { useResolvedTheme } from '@/lib/hooks/use-resolved-theme';
import { useWeatherData } from '@/lib/hooks/use-weather-data';
import { applyThemePreference } from '@/lib/theme';
import { useDashboardStore } from '@/store/dashboard-store';

const TOOLBAR_BUTTON =
  'rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-accent';

export function Dashboard() {
  const hasHydrated = useHasHydrated();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const location = useDashboardStore((state) => state.location);
  const setLocation = useDashboardStore((state) => state.setLocation);
  const savedLocations = useDashboardStore((state) => state.savedLocations);
  const saveLocation = useDashboardStore((state) => state.saveLocation);
  const removeSavedLocation = useDashboardStore((state) => state.removeSavedLocation);
  const unitSystem = useDashboardStore((state) => state.unitSystem);
  const setUnitSystem = useDashboardStore((state) => state.setUnitSystem);
  const theme = useDashboardStore((state) => state.theme);
  const setTheme = useDashboardStore((state) => state.setTheme);
  const resolvedTheme = useResolvedTheme(theme);
  const cards = useDashboardStore((state) => state.cards);
  const isEditing = useDashboardStore((state) => state.isEditing);
  const setEditing = useDashboardStore((state) => state.setEditing);
  const addCard = useDashboardStore((state) => state.addCard);
  const removeCard = useDashboardStore((state) => state.removeCard);
  const moveCard = useDashboardStore((state) => state.moveCard);
  const setCardSpan = useDashboardStore((state) => state.setCardSpan);
  const reorderCards = useDashboardStore((state) => state.reorderCards);
  const applyPreset = useDashboardStore((state) => state.applyPreset);
  const restoreDefaults = useDashboardStore((state) => state.restoreDefaults);

  // The inline script in layout.tsx sets the theme before paint; this keeps the attribute in step
  // when the user changes it afterwards.
  useEffect(() => {
    if (hasHydrated) applyThemePreference(theme, document.documentElement);
  }, [theme, hasHydrated]);

  // Until saved preferences have loaded we don't know which location to request, so no fetch is
  // started and every card shows its loading state.
  const state = useWeatherData(hasHydrated ? location : null);

  const data = state.status === 'ready' ? state.data : undefined;
  const isLoading = !hasHydrated || state.status === 'loading';
  const errorMessage = state.status === 'error' ? (state.errorMessage ?? 'Unable to load weather data.') : undefined;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-strong">Weather Dashboard</h1>
            <p className="mt-1 text-sm text-muted">Live conditions from Open-Meteo, arranged however you like.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <UnitToggle unitSystem={unitSystem} onChange={setUnitSystem} />
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full max-w-md">
            <LocationSearch onSelect={setLocation} />
          </div>
          {hasHydrated && (
            <SavedLocations
              active={location}
              saved={savedLocations}
              onSelect={setLocation}
              onSave={saveLocation}
              onRemove={removeSavedLocation}
            />
          )}
        </div>
      </header>

      <Hero
        location={location}
        data={data}
        isLoading={isLoading}
        errorMessage={errorMessage}
        unitSystem={unitSystem}
        hasHydrated={hasHydrated}
        resolvedTheme={resolvedTheme}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setEditing(!isEditing);
            if (isEditing) setIsDrawerOpen(false);
          }}
          aria-pressed={isEditing}
          className={
            isEditing
              ? 'rounded-full bg-ink px-4 py-2 text-sm font-semibold text-card outline-none focus-visible:ring-2 focus-visible:ring-accent'
              : TOOLBAR_BUTTON
          }
        >
          {isEditing ? 'Done editing' : 'Edit dashboard'}
        </button>

        {isEditing && (
          <>
            <button
              type="button"
              onClick={() => setIsDrawerOpen((open) => !open)}
              aria-expanded={isDrawerOpen}
              className={TOOLBAR_BUTTON}
            >
              Add a card
            </button>
            <button type="button" onClick={restoreDefaults} className={TOOLBAR_BUTTON}>
              Restore defaults
            </button>
            <p className="text-sm text-muted">Reorder by dragging, or with the up and down buttons on each card.</p>
          </>
        )}
      </div>

      {isEditing && (
        <>
          <LayoutPresets onApply={applyPreset} />
          <AddCardDrawer
            isOpen={isDrawerOpen}
            activeCardIds={cards.map((card) => card.id)}
            onAdd={addCard}
            onClose={() => setIsDrawerOpen(false)}
          />
        </>
      )}

      {/* Rendering the saved layout before rehydration would flash the defaults, so the grid waits. */}
      <CardGrid
        cards={cards}
        isHydrated={hasHydrated}
        cardProps={{ data, isLoading, errorMessage, unitSystem }}
        isEditing={isEditing}
        onReorder={reorderCards}
        onMove={moveCard}
        onSetSpan={setCardSpan}
        onRemove={removeCard}
      />
    </div>
  );
}
