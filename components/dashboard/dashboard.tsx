'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrangeToolbar } from '@/components/dashboard/arrange-toolbar';
import { CardGrid } from '@/components/dashboard/card-grid';
import { Hero } from '@/components/dashboard/hero';
import { Menu } from '@/components/dashboard/menu';
import { LocationPanel } from '@/components/location/location-panel';
import { Onboarding } from '@/components/onboarding/onboarding';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { useHasHydrated } from '@/lib/hooks/use-has-hydrated';
import { useResolvedTheme } from '@/lib/hooks/use-resolved-theme';
import { useWeatherData } from '@/lib/hooks/use-weather-data';
import { applyThemePreference } from '@/lib/theme';
import { buildShareUrl, decodePreferences, SHARE_PARAM } from '@/lib/weather/share-link';
import { useDashboardStore } from '@/store/dashboard-store';

export function Dashboard() {
  const hasHydrated = useHasHydrated();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  // A ref, not state: a drag starting and stopping should not re-render the whole dashboard.
  const isDraggingCardRef = useRef(false);

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
  const toggleCard = useDashboardStore((state) => state.toggleCard);
  const removeCard = useDashboardStore((state) => state.removeCard);
  const moveCard = useDashboardStore((state) => state.moveCard);
  const setCardSize = useDashboardStore((state) => state.setCardSize);
  const reorderCards = useDashboardStore((state) => state.reorderCards);
  const applyPreset = useDashboardStore((state) => state.applyPreset);
  const restoreDefaults = useDashboardStore((state) => state.restoreDefaults);
  const activities = useDashboardStore((state) => state.activities);
  const hasOnboarded = useDashboardStore((state) => state.hasOnboarded);
  const completeOnboarding = useDashboardStore((state) => state.completeOnboarding);
  const skipOnboarding = useDashboardStore((state) => state.skipOnboarding);
  const restartOnboarding = useDashboardStore((state) => state.restartOnboarding);
  const applyPreferences = useDashboardStore((state) => state.applyPreferences);

  const hasReadShareLink = useRef(false);

  /**
   * Applies a shared setup link, once, after rehydration — running earlier would have the restored
   * preferences land on top of it.
   *
   * The parameter is stripped whether or not it was usable: a good link must not re-apply over
   * later edits every time the page is refreshed, and a bad one should not sit in the address bar
   * inviting another try. A link that fails to decode is simply ignored — `decodePreferences`
   * validates it exactly as stored preferences are validated, because a URL can come from anyone.
   */
  useEffect(() => {
    if (!hasHydrated || hasReadShareLink.current) return;
    hasReadShareLink.current = true;

    const params = new URLSearchParams(window.location.search);
    if (!params.has(SHARE_PARAM)) return;

    const shared = decodePreferences(params.get(SHARE_PARAM));
    if (shared) applyPreferences(shared);

    params.delete(SHARE_PARAM);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [hasHydrated, applyPreferences]);

  // Read at click time rather than render time, so the link always carries the current setup.
  const getShareUrl = useCallback(
    () =>
      buildShareUrl(window.location.href, {
        location,
        savedLocations,
        unitSystem,
        theme,
        cards,
        activities,
        hasOnboarded,
      }),
    [location, savedLocations, unitSystem, theme, cards, activities, hasOnboarded],
  );

  // The inline script in layout.tsx sets the theme before paint; this keeps the attribute in step
  // when the user changes it afterwards.
  useEffect(() => {
    if (hasHydrated) applyThemePreference(theme, document.documentElement);
  }, [theme, hasHydrated]);

  // Until saved preferences have loaded we don't know which location to request, so no fetch is
  // started and every module shows its loading state.
  const { state, refresh, isRefreshing, staleData } = useWeatherData(hasHydrated ? location : null);

  const isLoading = !hasHydrated || state.status === 'loading';
  const failed = state.status === 'error' ? (state.errorMessage ?? 'Unable to load weather data.') : undefined;

  // A failed *refresh* keeps the last good reading on screen rather than emptying a working
  // dashboard. The modules are then handed real data with no error, and the hero alone carries
  // the failure — so the page says "this is old" once, instead of shouting it from every tile.
  const data = state.status === 'ready' ? state.data : staleData;
  const isStale = Boolean(failed && staleData);

  // Modules never render the shared failure themselves. There is exactly one request behind the
  // whole dashboard, so repeating its error in every tile produced seven identical role="alert"
  // nodes — announced seven times, and a wall of red on a phone. The hero states it once; modules
  // fall back to their quiet "unavailable" state, which is what an absent reading looks like
  // everywhere else in the app.

  const exitArranging = useCallback(() => {
    setEditing(false);
    // Arrange mode is entered from the menu, so that is where a keyboard user expects to be put
    // back down — same convention the dialogs already follow.
    menuTriggerRef.current?.focus();
  }, [setEditing]);

  // Whichever dialog is open owns Escape, so this stands down entirely rather than trying to
  // out-order its handler.
  const isModalOpen = isMenuOpen || isLocationPanelOpen || (hasHydrated && !hasOnboarded);

  useEscapeKey(isEditing && !isModalOpen, () => {
    // dnd-kit's sensors also cancel on Escape, and they do it without calling preventDefault. With
    // a module lifted, Escape means "put it back" — leaving arrange mode too would throw away the
    // drag and the mode in one keystroke.
    if (isDraggingCardRef.current) return;
    exitArranging();
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col">
      {/* Waits for hydration like the grid does: rendering before saved preferences load would show
          the first-run flow to someone who finished it months ago. */}
      {hasHydrated && !hasOnboarded && (
        <Onboarding
          initialLocation={location}
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}

      <header className="flex items-start justify-between gap-4 border-b border-line-strong pb-4">
        <div>
          <h1 className="font-display text-3xl leading-none tracking-tight text-ink-strong sm:text-4xl">
            Weather
          </h1>
          <p className="eyebrow mt-2 text-muted">Open-Meteo · arranged however you like</p>
        </div>

        <Menu
          isOpen={isMenuOpen}
          onOpen={() => setIsMenuOpen(true)}
          onClose={() => setIsMenuOpen(false)}
          activeCardIds={cards.map((card) => card.id)}
          onToggleCard={toggleCard}
          unitSystem={unitSystem}
          onUnitChange={setUnitSystem}
          theme={theme}
          onThemeChange={setTheme}
          isEditing={isEditing}
          onEditingChange={setEditing}
          onApplyPreset={applyPreset}
          onRestoreDefaults={restoreDefaults}
          getShareUrl={getShareUrl}
          onRestartOnboarding={restartOnboarding}
          triggerRef={menuTriggerRef}
        />
      </header>

      <Hero
        location={location}
        data={data}
        isLoading={isLoading && !data}
        errorMessage={isStale ? undefined : failed}
        unitSystem={unitSystem}
        hasHydrated={hasHydrated}
        resolvedTheme={resolvedTheme}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        isStale={isStale}
        failureMessage={failed}
        onOpenLocationPanel={() => setIsLocationPanelOpen(true)}
        locationButtonRef={locationButtonRef}
      />

      <LocationPanel
        isOpen={isLocationPanelOpen}
        onClose={() => setIsLocationPanelOpen(false)}
        triggerRef={locationButtonRef}
        hasHydrated={hasHydrated}
        active={location}
        saved={savedLocations}
        onSelect={setLocation}
        onSave={saveLocation}
        onRemove={removeSavedLocation}
      />

      {isEditing && <ArrangeToolbar onDone={exitArranging} />}

      {/* Rendering the saved layout before rehydration would flash the defaults, so the grid waits. */}
      <CardGrid
        cards={cards}
        isHydrated={hasHydrated}
        cardProps={{ data, isLoading: isLoading && !data, unitSystem, activities }}
        isEditing={isEditing}
        onReorder={reorderCards}
        onMove={moveCard}
        onSetSize={setCardSize}
        onRemove={removeCard}
        onDragActiveChange={(isDragActive) => {
          isDraggingCardRef.current = isDragActive;
        }}
      />
    </div>
  );
}
