'use client';

import { useEffect, useId, useRef } from 'react';

interface ArrangeToolbarProps {
  onDone: () => void;
}

/**
 * The way out of arrange mode, and the only description of what arrange mode is.
 *
 * Sticky because the grid is long: having entered from the menu, you should not have to scroll
 * back to anything to leave. It sits below the menu overlay and panel, and below the lifted
 * module, which floats over everything while you are carrying it.
 *
 * `role="group"` rather than `role="status"`. A status region is `aria-live` over its whole
 * subtree, so every re-render would re-announce the button sitting inside it. Describing the
 * button with the hint instead means focusing it reads out both the control and the mode, once.
 */
export function ArrangeToolbar({ onDone }: ArrangeToolbarProps) {
  const doneRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();

  // The toolbar only exists while arranging, so mounting is entering. Taking focus here is what
  // announces the mode change and puts the next Tab on the first module's controls.
  useEffect(() => {
    doneRef.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-label="Arranging modules"
      className="sticky top-0 z-30 mt-6 flex items-center justify-between gap-4 border-y border-line-strong bg-canvas px-4 py-2.5"
    >
      {/* Kept to one short line: this bar is pinned for as long as arranging lasts, and the
          sentence that also described the arrows was costing a quarter of a phone screen to say
          what the buttons on every module already show. */}
      <p id={hintId} className="eyebrow min-w-0 text-muted">
        Arranging — drag a module by its handle.
      </p>

      <button
        ref={doneRef}
        type="button"
        onClick={onDone}
        aria-describedby={hintId}
        className="flex min-h-11 shrink-0 items-center border border-line-strong bg-accent px-4 text-xs uppercase tracking-[0.14em] text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Done
      </button>
    </div>
  );
}
