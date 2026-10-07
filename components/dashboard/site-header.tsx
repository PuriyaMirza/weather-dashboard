'use client';

import { useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { formatLocationLabel, type SelectedLocation } from '@/lib/weather/location';
import { formatTime } from '@/lib/weather/units';

interface SiteHeaderProps {
  location: SelectedLocation;
  hasHydrated: boolean;
  /** When the reading on screen was fetched; absent until one has loaded. */
  updatedAt?: string;
  /** The location's IANA zone, for the fallback clock time. */
  timeZone?: string;
  /** True when the reading on screen is the last good one and the newest attempt failed. */
  isStale: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenLocationPanel: () => void;
  /** Attached to the location button, so closing the dialog can return focus to it. */
  locationButtonRef: RefObject<HTMLButtonElement | null>;
  /** Opens the Compare view. */
  onCompare: () => void;
  /** Attached to the Compare button, so leaving the view can return focus to it. */
  compareButtonRef: RefObject<HTMLButtonElement | null>;
  /** The settings menu, rendered at the header's right edge. */
  menu: ReactNode;
}

const MINUTE_MS = 60 * 1000;

function subscribeToMinutes(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, MINUTE_MS / 4);
  return () => window.clearInterval(timer);
}

/**
 * The current minute, re-rendering only when it rolls over. A snapshot of the minute (not the
 * millisecond) keeps `useSyncExternalStore`'s identity check stable between ticks.
 */
function useCurrentMinute(): number {
  return useSyncExternalStore(
    subscribeToMinutes,
    () => Math.floor(Date.now() / MINUTE_MS),
    () => 0,
  );
}

/**
 * "Updated 12 min ago" for the last hour, then the clock time — "Updated 190 min ago" is harder to
 * read than "Updated 3:05 PM", and past an hour the exact age matters less than when.
 */
export function formatUpdated(updatedAt: string, nowMs: number, timeZone?: string): string {
  const updated = Date.parse(updatedAt);
  if (Number.isNaN(updated)) return '';
  // Clamped: the minute clock can lag a just-finished fetch by a few seconds.
  const minutes = Math.max(0, Math.floor((nowMs - updated) / MINUTE_MS));
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes} min ago`;
  return `Updated ${formatTime(updatedAt, timeZone)}`;
}

/**
 * The frosted bar pinned to the top of the page: where you are (and the control to change it), how
 * fresh the reading is, and the page-level actions.
 *
 * The blur lives on a separate layer rather than on the <header> itself: `backdrop-filter` makes
 * an element the containing block for its fixed-position descendants, which would trap the menu's
 * full-height drawer inside this 80px bar.
 */
export function SiteHeader({
  location,
  hasHydrated,
  updatedAt,
  timeZone,
  isStale,
  onRefresh,
  isRefreshing,
  onOpenLocationPanel,
  locationButtonRef,
  onCompare,
  compareButtonRef,
  menu,
}: SiteHeaderProps) {
  const minute = useCurrentMinute();
  const updatedLabel = updatedAt && minute > 0 ? formatUpdated(updatedAt, minute * MINUTE_MS, timeZone) : '';

  return (
    <header className="sticky top-0 z-40 h-[var(--header-height)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-surface-container-low/75 shadow-header backdrop-blur-xl"
      />

      <div className="relative mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-5">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* The page's title for assistive tech and the document outline; the location is the
              visible masthead. */}
          <h1 className="sr-only">Weather</h1>

          {hasHydrated ? (
            <button
              ref={locationButtonRef}
              type="button"
              onClick={onOpenLocationPanel}
              aria-label={`Change location. Currently ${formatLocationLabel(location)}.`}
              className="group -ml-1 flex min-h-11 min-w-11 max-w-full items-center gap-1 rounded-lg px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed"
            >
              <span className="truncate type-headline-sm tracking-tight text-primary">{location.name}</span>
              <Icon
                name="expand-more"
                size={20}
                className="shrink-0 text-secondary transition-transform group-hover:translate-y-0.5"
              />
            </button>
          ) : (
            <p className="flex min-h-11 items-center type-headline-sm text-primary">Loading…</p>
          )}

          {updatedLabel && (
            <p className="-mt-1.5 truncate type-label-sm uppercase text-on-secondary-container">{updatedLabel}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {updatedAt &&
            (isStale ? (
              <Chip className="bg-error-container! text-on-error-container! uppercase">Stale</Chip>
            ) : (
              <Chip dot className="uppercase">
                Live
              </Chip>
            ))}

          {hasHydrated && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-busy={isRefreshing || undefined}
              className="flex h-11 w-11 items-center justify-center rounded-full text-secondary outline-none hover:bg-surface-container-highest hover:text-primary focus-visible:ring-2 focus-visible:ring-secondary-fixed disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="refresh" size={22} className={isRefreshing ? 'animate-spin' : undefined} />
              <span className="sr-only">Refresh</span>
            </button>
          )}

          {hasHydrated && (
            // The word hides on a phone, where the header cannot spare the width, but stays in the
            // accessible name — so voice control and screen readers still hear "Compare".
            <button
              ref={compareButtonRef}
              type="button"
              onClick={onCompare}
              className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-secondary outline-none hover:bg-surface-container-highest hover:text-primary focus-visible:ring-2 focus-visible:ring-secondary-fixed sm:px-3.5"
            >
              <Icon name="compare-arrows" size={22} />
              <span className="sr-only type-label-lg sm:not-sr-only">Compare</span>
            </button>
          )}

          {menu}
        </div>
      </div>
    </header>
  );
}
