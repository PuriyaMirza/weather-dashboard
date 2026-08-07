'use client';

import type { CardSpan } from '@/lib/weather/card-layout';

interface CardControlsProps {
  title: string;
  span: CardSpan;
  isFirst: boolean;
  isLast: boolean;
  position: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleSpan: () => void;
  onRemove: () => void;
  /** Props from useSortable that turn the handle into a drag/keyboard-drag affordance. */
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
}

const BUTTON_CLASS =
  'rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Edit affordances for a single card.
 *
 * Drag is never the only way to reorder: the move up/down buttons do the same job with no pointer
 * and no drag model at all, and every button carries the card's name so a screen-reader user is
 * never left guessing which "Move up" they are on.
 */
export function CardControls({
  title,
  span,
  isFirst,
  isLast,
  position,
  total,
  onMoveUp,
  onMoveDown,
  onToggleSpan,
  onRemove,
  dragHandleProps,
}: CardControlsProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 p-2">
      <button
        type="button"
        {...dragHandleProps}
        className={`${BUTTON_CLASS} cursor-grab active:cursor-grabbing`}
        aria-label={`Reorder ${title}. Position ${position} of ${total}. Press space or enter, then use the arrow keys.`}
      >
        <span aria-hidden="true">⠿ Drag</span>
      </button>

      <button type="button" onClick={onMoveUp} disabled={isFirst} className={BUTTON_CLASS} aria-label={`Move ${title} earlier`}>
        <span aria-hidden="true">↑</span> Up
      </button>

      <button type="button" onClick={onMoveDown} disabled={isLast} className={BUTTON_CLASS} aria-label={`Move ${title} later`}>
        <span aria-hidden="true">↓</span> Down
      </button>

      <button
        type="button"
        onClick={onToggleSpan}
        className={BUTTON_CLASS}
        aria-pressed={span === 'wide'}
        aria-label={`Make ${title} ${span === 'wide' ? 'narrow' : 'wide'}`}
      >
        {span === 'wide' ? 'Narrow' : 'Wide'}
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-600"
        aria-label={`Remove ${title} from the dashboard`}
      >
        Remove
      </button>
    </div>
  );
}
