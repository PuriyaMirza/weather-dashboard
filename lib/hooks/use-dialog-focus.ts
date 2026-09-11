'use client';

import { useEffect, type RefObject } from 'react';

export const DIALOG_FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour every modal surface in the app owes its users: Escape dismisses, Tab cycles
 * inside the panel rather than wandering onto the page behind it, and focus lands somewhere useful
 * when the panel appears.
 *
 * Shared rather than copied because this is exactly the logic that rots when it exists twice — the
 * second dialog gets the trap subtly wrong and nobody notices until someone tabs off the end of it.
 *
 * `focusKey` re-runs the focus move when it changes, which is what a multi-step flow needs: each
 * step should start at its own first control, not leave focus on a button that no longer exists.
 */
export function useDialogFocus(
  isOpen: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  focusKey?: unknown,
) {
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key !== 'Tab') return;

      // Trap Tab inside the panel. Without this, tabbing past the last control silently moves
      // focus to the page behind an overlay the user cannot see past.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, panelRef, onDismiss]);

  // Move focus into the panel when it opens, so the first Tab lands somewhere sensible.
  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector<HTMLElement>(DIALOG_FOCUSABLE)?.focus();
  }, [isOpen, panelRef, focusKey]);
}
