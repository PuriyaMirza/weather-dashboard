'use client';

import { useEffect, useRef } from 'react';

/**
 * Escape for a mode that is not a dialog.
 *
 * Deliberately not folded into `useDialogFocus`: there is no panel, nothing to trap Tab inside,
 * and no focus to move on open. All that is shared is the key.
 *
 * The caller passes `enabled: false` while a dialog is open rather than trying to detect one from
 * inside the handler. Checking `event.defaultPrevented` looks like it would work and does not —
 * this listener is registered while the mode is on, a dialog's is registered later when it opens,
 * so this one runs *first* and the flag is still false.
 */
export function useEscapeKey(enabled: boolean, onEscape: () => void) {
  // Kept in a ref so the listener is registered once per mode change rather than re-bound on
  // every render by a caller passing an inline callback.
  const handler = useRef(onEscape);
  useEffect(() => {
    handler.current = onEscape;
  });

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') handler.current();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
