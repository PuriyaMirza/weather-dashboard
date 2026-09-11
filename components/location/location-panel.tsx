'use client';

import { useCallback, useId, useRef, type RefObject } from 'react';
import { SavedLocations } from '@/components/dashboard/saved-locations';
import { useDialogFocus } from '@/lib/hooks/use-dialog-focus';
import type { SelectedLocation } from '@/lib/weather/location';
import { LocationSearch } from './location-search';

interface LocationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** The hero's location button, so closing returns focus there rather than dropping it. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** `SavedLocations` waits for hydration the same way it always has — see the dashboard. */
  hasHydrated: boolean;
  active: SelectedLocation;
  saved: SelectedLocation[];
  onSelect: (location: SelectedLocation) => void;
  onSave: (location: SelectedLocation) => void;
  onRemove: (id: string) => void;
}

/**
 * Where changing location now lives.
 *
 * This used to sit permanently at the top of the page, ahead of any actual weather — the search
 * box and the saved-location chips, every visit, whether or not you ever touch them. Changing
 * location is rare, so it moved behind the location name in the hero instead. `LocationSearch` and
 * `SavedLocations` are unchanged, just relocated: `LocationSearch` was already a proper combobox
 * with a listbox and a live region, so it needed nothing to work inside a dialog.
 */
export function LocationPanel({
  isOpen,
  onClose,
  triggerRef,
  hasHydrated,
  active,
  saved,
  onSelect,
  onSave,
  onRemove,
}: LocationPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    onClose();
    triggerRef.current?.focus();
  }, [onClose, triggerRef]);

  useDialogFocus(isOpen, panelRef, close);

  if (!isOpen) return null;

  // Picking a location is the one action that should also close the panel — there is nothing left
  // to do here once a place is chosen. Saving the current location is not a selection, so it stays
  // open, in case someone wants to search for somewhere else right after.
  function handleSelect(location: SelectedLocation) {
    onSelect(location);
    close();
  }

  return (
    <>
      {/* Not a focus target: Escape and the close button cover keyboard users, and a tabbable
          overlay would just be a dead stop in the order — same reasoning as the settings menu. */}
      <div className="fixed inset-0 z-40 bg-canvas/70" onClick={close} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 border border-line-strong bg-card p-5"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={titleId} className="font-display text-2xl leading-none text-ink-strong">
            Change location
          </h2>
          <button
            type="button"
            onClick={close}
            className="eyebrow text-muted outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-accent"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          <LocationSearch onSelect={handleSelect} />
        </div>

        {hasHydrated && (
          <div className="mt-5 border-t border-line pt-4">
            <SavedLocations active={active} saved={saved} onSelect={handleSelect} onSave={onSave} onRemove={onRemove} />
          </div>
        )}
      </div>
    </>
  );
}
