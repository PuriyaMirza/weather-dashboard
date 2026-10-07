'use client';

import { useCallback, useId, useRef, useState, type RefObject } from 'react';
import { LocationSearch } from '@/components/location/location-search';
import { Icon } from '@/components/ui/icon';
import { useDialogFocus } from '@/lib/hooks/use-dialog-focus';
import { isSamePlace } from '@/lib/weather/compare';
import type { SelectedLocation } from '@/lib/weather/location';
import { CompareSavedPlaces, placesToCompare } from './compare-saved-places';

interface CompareLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Whichever control opened the picker — the empty prompt's button or the compared card's Change
   * — so closing puts focus back where it came from.
   */
  returnFocusRef: RefObject<HTMLElement | null>;
  mainLocation: SelectedLocation;
  compareLocation: SelectedLocation | null;
  saved: SelectedLocation[];
  onSelect: (location: SelectedLocation) => void;
}

export const SAME_PLACE_MESSAGE = 'That’s already your main location — pick somewhere else.';

/**
 * Chooses the place the Compare view sets beside the main location: a search, plus the saved
 * places as one-tap chips.
 *
 * The same dialog shape as the location panel (`useDialogFocus`: Escape closes, Tab stays inside,
 * focus returns to the trigger). The main location is left out of the chips, but search can still
 * turn it up — and picking it there says why nothing happened instead of silently doing nothing.
 */
export function CompareLocationPicker({
  isOpen,
  onClose,
  returnFocusRef,
  mainLocation,
  compareLocation,
  saved,
  onSelect,
}: CompareLocationPickerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const close = useCallback(() => {
    setMessage(null);
    onClose();
    returnFocusRef.current?.focus();
  }, [onClose, returnFocusRef]);

  useDialogFocus(isOpen, panelRef, close);

  if (!isOpen) return null;

  function handleSelect(location: SelectedLocation) {
    if (isSamePlace(location, mainLocation)) {
      setMessage(SAME_PLACE_MESSAGE);
      return;
    }
    onSelect(location);
    close();
  }

  const others = placesToCompare(saved, mainLocation);

  return (
    <>
      {/* Not a focus target, for the same reason as the location panel's overlay. */}
      <div className="fixed inset-0 z-40 bg-surface/70 backdrop-blur-sm" onClick={close} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed left-1/2 top-24 z-50 max-h-[calc(100dvh-7rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-y-auto rounded-2xl bg-surface-container-low p-5 text-on-surface shadow-raised"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="type-headline-sm text-primary">
            Compare with…
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant outline-none hover:bg-surface-container-high hover:text-primary focus-visible:ring-2 focus-visible:ring-secondary-fixed"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="mt-5">
          <LocationSearch onSelect={handleSelect} />
        </div>

        {message && (
          <p role="alert" className="mt-3 flex items-start gap-2 type-body-sm text-error">
            <Icon name="error" size={18} className="mt-px shrink-0" />
            <span>{message}</span>
          </p>
        )}

        {others.length > 0 && (
          <div className="mt-5 border-t border-outline-variant pt-4">
            <p aria-hidden="true" className="mb-3 type-label-sm uppercase text-secondary">
              Saved places
            </p>
            <CompareSavedPlaces places={others} current={compareLocation} onSelect={handleSelect} />
          </div>
        )}
      </div>
    </>
  );
}
