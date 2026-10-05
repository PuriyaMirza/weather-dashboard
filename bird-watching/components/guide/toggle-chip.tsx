import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

interface ToggleChipProps {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * A filter chip. A real toggle button (aria-pressed) rather than a styled checkbox, and the
 * pressed state shows a check mark as well as a fill, so it never relies on colour alone.
 */
export function ToggleChip({ pressed, onToggle, children }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 type-label-lg ${
        pressed
          ? 'border-secondary-fixed bg-secondary-fixed text-on-secondary'
          : 'border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high'
      }`}
    >
      {pressed && <Icon name="check" size={18} />}
      {children}
    </button>
  );
}
