import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  /** A small leading dot — decorative, the chip's text always carries the meaning. */
  dot?: boolean;
  className?: string;
}

/** A small rounded label: status pills, the hero's region chip, "LIVE". */
export function Chip({ children, dot = false, className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest/70 px-3 py-1 type-label-md text-secondary-fixed ${className}`.trim()}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-fixed" />}
      {children}
    </span>
  );
}
