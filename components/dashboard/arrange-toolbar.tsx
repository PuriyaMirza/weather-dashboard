'use client';

import { useEffect, useId, useRef } from 'react';
import { Icon } from '@/components/ui/icon';

interface ArrangeToolbarProps {
  onDone: () => void;
  /** Title of the module waiting to be placed, or null when nothing is lifted. */
  liftedTitle: string | null;
  onCancelLift: () => void;
  /** Spoken updates for a state whose only other signal is an outline moving. */
  announcement: string;
}

/**
 * The way out of arrange mode, and the only description of what arrange mode is.
 *
 * Sticky because the grid is long: having entered from the menu, you should not have to scroll
 * back to anything to leave. It pins directly under the sticky header (`--header-height`) rather
 * than at the top, where the header would cover it, and sits below the header, the menu overlay and
 * panel, and the lifted module, which floats over everything while you are carrying it.
 *
 * `role="group"` rather than `role="status"`. A status region is `aria-live` over its whole
 * subtree, so every re-render would re-announce the button sitting inside it. Describing the
 * button with the hint instead means focusing it reads out both the control and the mode, once.
 */
export function ArrangeToolbar({ onDone, liftedTitle, onCancelLift, announcement }: ArrangeToolbarProps) {
  const doneRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const isPlacing = liftedTitle !== null;

  // The toolbar only exists while arranging, so mounting is entering. Taking focus here is what
  // announces the mode change and puts the next Tab on the first module's controls.
  useEffect(() => {
    doneRef.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-label="Arranging modules"
      className="sticky top-[var(--header-height)] z-30 mt-6 flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low/80 px-4 py-2.5 shadow-header backdrop-blur-xl"
    >
      {/* Kept to one short line: this bar is pinned for as long as arranging lasts, and the
          sentence that also described the arrows was costing a quarter of a phone screen to say
          what the buttons on every module already show. */}
      <p id={hintId} className="flex min-w-0 items-center gap-2 type-body-sm text-on-surface">
        <Icon name="tune" size={18} className="shrink-0 text-secondary-fixed" />
        <span>
          {isPlacing ? `Placing ${liftedTitle} — choose a slot.` : 'Arranging — tap a handle to move a module, or drag it.'}
        </span>
      </p>

      {/*
        The live region is separate from the hint above, and empty until something happens. Picking
        a module up and putting it down changes nothing a screen reader would otherwise notice —
        the visible signal is an outline moving between tiles.
      */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {isPlacing ? (
        <button
          type="button"
          onClick={onCancelLift}
          className="flex min-h-11 shrink-0 items-center rounded-full border border-outline-variant px-5 type-label-lg text-on-surface outline-none hover:bg-surface-container-highest focus-visible:ring-2 focus-visible:ring-secondary-fixed"
        >
          Cancel
        </button>
      ) : (
        <button
          ref={doneRef}
          type="button"
          onClick={onDone}
          aria-describedby={hintId}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-secondary-fixed px-5 type-label-lg text-on-secondary outline-none hover:bg-primary-fixed focus-visible:ring-2 focus-visible:ring-secondary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Icon name="check" size={18} />
          Done
        </button>
      )}
    </div>
  );
}
