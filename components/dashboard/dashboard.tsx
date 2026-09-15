'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { ArrangeToolbar } from '@/components/dashboard/arrange-toolbar';
import { CardGrid } from '@/components/dashboard/card-grid';
import { Hero } from '@/components/dashboard/hero';
import { LedgerFooter } from '@/components/dashboard/ledger-footer';
import { Menu } from '@/components/dashboard/menu';
import { LocationPanel } from '@/components/location/location-panel';
import { Onboarding } from '@/components/onboarding/onboarding';
import { getCardDefinition, type WeatherCardId } from '@/components/weather/card-registry';
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
  // The module picked up by tapping its handle, waiting for a destination. Owned here rather than
  // in the grid because the toolbar's Cancel and the Escape key both drive it.
  const [liftedId, setLiftedId] = useState<WeatherCardId | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');

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
    setLiftedId(null);
    setMoveAnnouncement('');
    // Arrange mode is entered from the menu, so that is where a keyboard user expects to be put
    // back down — same convention the dialogs already follow.
    menuTriggerRef.current?.focus();
  }, [setEditing]);

  const liftedTitle = liftedId ? (getCardDefinition(liftedId)?.title ?? null) : null;

  const cancelLift = useCallback(() => setLiftedId(null), []);

  const toggleLift = useCallback(
    (id: WeatherCardId) => {
      const title = getCardDefinition(id)?.title ?? 'Module';
      setLiftedId((current) => (current === id ? null : id));
      setMoveAnnouncement(
        liftedId === id ? `Stopped moving ${title}.` : `Moving ${title}. Choose where it goes.`,
      );
    },
    [liftedId],
  );

  const placeLiftedAt = useCallback(
    (targetId: WeatherCardId) => {
      if (!liftedId) return;
      const from = cards.findIndex((card) => card.id === liftedId);
      const to = cards.findIndex((card) => card.id === targetId);
      setLiftedId(null);
      if (from < 0 || to < 0) return;

      reorderCards(arrayMove(cards, from, to).map((card) => card.id));
      setMoveAnnouncement(
        `${getCardDefinition(liftedId)?.title ?? 'Module'} moved to position ${to + 1} of ${cards.length}.`,
      );
    },
    [cards, liftedId, reorderCards],
  );

  // Whichever dialog is open owns Escape, so this stands down entirely rather than trying to
  // out-order its handler.
  const isModalOpen = isMenuOpen || isLocationPanelOpen || (hasHydrated && !hasOnboarded);

  useEscapeKey(isEditing && !isModalOpen, () => {
    // Escape unwinds one layer at a time. A module part-way through a move is the innermost layer,
    // so the first press puts it back and only the next one leaves arrange mode.
    if (liftedId) {
      cancelLift();
      return;
    }
    // A drag cancels itself — dnd-kit's sensors handle Escape, without calling preventDefault, so
    // this cannot rely on the event being consumed and has to stand down explicitly.
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

        <div className="flex items-start gap-3">
          {/* Purely decorative masthead stamp — no information beyond what the wordmark already
              states, so it stays out of the accessibility tree rather than duplicating it. */}
          <div
            aria-hidden="true"
            className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-strong"
          >
            <span className="pointer-events-none absolute inset-1 rounded-full border border-dashed border-muted" />
            <span className="font-display relative text-center text-[9px] leading-[1.15] tracking-[0.06em] text-ink-strong">
              WX
            </span>
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
        </div>
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

      {isEditing && (
        <ArrangeToolbar
          onDone={exitArranging}
          liftedTitle={liftedTitle}
          onCancelLift={cancelLift}
          announcement={moveAnnouncement}
        />
      )}

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
          // Starting a drag abandons a pending tap-placement: one move at a time.
          if (isDragActive) setLiftedId(null);
        }}
        liftedId={liftedId}
        onToggleLift={toggleLift}
        onPlaceAt={placeLiftedAt}
      />

      <LedgerFooter />
    </div>
  );
}
