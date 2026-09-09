'use client';

import { CARD_SIZES, CARD_SIZE_LABEL, type CardSize } from '@/lib/weather/card-layout';

interface CardControlsProps {
  title: string;
  size: CardSize;
  isFirst: boolean;
  isLast: boolean;
  position: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetSize: (size: CardSize) => void;
  onRemove: () => void;
  /** Props from useSortable that turn the handle into a drag/keyboard-drag affordance. */
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
}

const BUTTON =
  'border border-line-strong bg-card px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-ink outline-none hover:bg-accent hover:text-accent-ink focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-card disabled:hover:text-ink';

/**
 * Edit affordances for a single module.
 *
 * Neither reordering nor resizing is ever pointer-only: the move buttons do the same job as a
 * drag with no drag model at all, and size is a labelled radio group rather than a corner handle.
 * Every control carries the module's name, so a screen-reader user is never left guessing which
 * "Move up" they are on.
 */
export function CardControls({
  title,
  size,
  isFirst,
  isLast,
  position,
  total,
  onMoveUp,
  onMoveDown,
  onSetSize,
  onRemove,
  dragHandleProps,
}: CardControlsProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
      <button
        type="button"
        {...dragHandleProps}
        className={`${BUTTON} cursor-grab active:cursor-grabbing`}
        aria-label={`Reorder ${title}. Position ${position} of ${total}. Press space or enter, then use the arrow keys.`}
      >
        <span aria-hidden="true">⠿</span>
      </button>

      <button type="button" onClick={onMoveUp} disabled={isFirst} className={BUTTON} aria-label={`Move ${title} earlier`}>
        <span aria-hidden="true">←</span>
      </button>

      <button type="button" onClick={onMoveDown} disabled={isLast} className={BUTTON} aria-label={`Move ${title} later`}>
        <span aria-hidden="true">→</span>
      </button>

      {/* A radio group, not a cycling button: the three sizes are all visible and directly
          reachable, and the current one is announced rather than merely drawn. */}
      <div role="radiogroup" aria-label={`Size of ${title}`} className="ml-1 flex gap-1">
        {CARD_SIZES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="radio"
            aria-checked={size === candidate}
            onClick={() => onSetSize(candidate)}
            className={
              size === candidate
                ? 'border border-line-strong bg-accent px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent'
                : BUTTON
            }
            aria-label={`${CARD_SIZE_LABEL[candidate]} ${title}`}
          >
            {CARD_SIZE_LABEL[candidate].charAt(0)}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto border border-danger-line bg-card px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-danger outline-none hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-danger"
        aria-label={`Remove ${title} from the dashboard`}
      >
        Remove
      </button>
    </div>
  );
}
