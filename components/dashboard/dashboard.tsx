'use client';

import { useState } from 'react';
import { AddCardDrawer } from '@/components/dashboard/add-card-drawer';
import { CardGrid } from '@/components/dashboard/card-grid';
import { LocationSearch } from '@/components/location/location-search';
import { UnitToggle } from '@/components/dashboard/unit-toggle';
import { useHasHydrated } from '@/lib/hooks/use-has-hydrated';
import { useWeatherData } from '@/lib/hooks/use-weather-data';
import { formatLocationLabel } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';

const TOOLBAR_BUTTON =
  'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-600';

export function Dashboard() {
  const hasHydrated = useHasHydrated();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const location = useDashboardStore((state) => state.location);
  const setLocation = useDashboardStore((state) => state.setLocation);
  const unitSystem = useDashboardStore((state) => state.unitSystem);
  const setUnitSystem = useDashboardStore((state) => state.setUnitSystem);
  const cards = useDashboardStore((state) => state.cards);
  const isEditing = useDashboardStore((state) => state.isEditing);
  const setEditing = useDashboardStore((state) => state.setEditing);
  const addCard = useDashboardStore((state) => state.addCard);
  const removeCard = useDashboardStore((state) => state.removeCard);
  const moveCard = useDashboardStore((state) => state.moveCard);
  const setCardSpan = useDashboardStore((state) => state.setCardSpan);
  const reorderCards = useDashboardStore((state) => state.reorderCards);
  const restoreDefaults = useDashboardStore((state) => state.restoreDefaults);

  // Until saved preferences have loaded we don't know which location to request, so no fetch is
  // started and every card shows its loading state.
  const state = useWeatherData(hasHydrated ? location : null);

  const data = state.status === 'ready' ? state.data : undefined;
  const isLoading = !hasHydrated || state.status === 'loading';
  const errorMessage = state.status === 'error' ? (state.errorMessage ?? 'Unable to load weather data.') : undefined;

  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="dashboard-title">
      <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/80 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 id="dashboard-title" className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Weather Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Live conditions from Open-Meteo. Search for any city or postal code, and choose which cards you see — your
              layout is remembered on this device.
            </p>
            <div className="mt-5 max-w-md">
              <LocationSearch onSelect={setLocation} />
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <UnitToggle unitSystem={unitSystem} onChange={setUnitSystem} />
            <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white" aria-label="Selected location">
              <p className="text-sm text-slate-300">Showing</p>
              <p className="text-xl font-semibold">{hasHydrated ? formatLocationLabel(location) : 'Loading…'}</p>
              <p className="mt-1 text-sm text-slate-300">Updated live from Open-Meteo</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => {
              setEditing(!isEditing);
              if (isEditing) setIsDrawerOpen(false);
            }}
            aria-pressed={isEditing}
            className={
              isEditing
                ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-sky-600'
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
              <p className="text-sm text-slate-600">
                Reorder by dragging, or with the up and down buttons on each card.
              </p>
            </>
          )}
        </div>

        {isEditing && (
          <AddCardDrawer
            isOpen={isDrawerOpen}
            activeCardIds={cards.map((card) => card.id)}
            onAdd={addCard}
            onClose={() => setIsDrawerOpen(false)}
          />
        )}
      </div>

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
    </section>
  );
}
