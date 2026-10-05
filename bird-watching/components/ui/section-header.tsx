import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: ReactNode;
  /** Small uppercase note on the right ("LIVE", "RAIN 10–40%"). */
  meta?: ReactNode;
  id?: string;
  className?: string;
}

/** A section title with an optional right-aligned note, as used above the hourly strip and grid. */
export function SectionHeader({ title, meta, id, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`.trim()}>
      <h2 id={id} className="type-headline-sm text-primary">
        {title}
      </h2>
      {meta != null && <span className="type-label-sm uppercase text-secondary-fixed">{meta}</span>}
    </div>
  );
}
