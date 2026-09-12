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
  /** Tells dnd-kit which element is the activator. Kept apart from the props above: a ref cannot
   *  travel inside an HTMLAttributes bag. */
  dragHandleRef: (node: HTMLElement | null) => void;
}

/**
 * The handle is the primary way to reorder, so it gets a real 44px target and full contrast.
 * `touch-none` is what makes a touch drag possible at all — without it the browser claims the
 * gesture for scrolling — and it is scoped to this button alone, because putting it on the card
 * would stop the page scrolling under a finger.
 */
const HANDLE =
  'flex h-11 w-11 shrink-0 cursor-grab touch-none select-none items-center justify-center border ' +
  'border-line-strong bg-card text-sm text-ink outline-none hover:bg-accent hover:text-accent-ink ' +
  'focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing';

/** Quieter than the handle now that dragging works, but never hidden: this is the only route that
 *  needs no pointer at all, so it must not sit behind a disclosure. */
const NUDGE =
  'flex h-8 w-8 items-center justify-center text-ink-strong outline-none hover:bg-accent ' +
  'hover:text-accent-ink focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed ' +
  'disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-strong';

const SIZE_CHIP =
  'flex h-8 w-8 items-center justify-center text-[0.625rem] uppercase tracking-[0.14em] outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Edit affordances for a single module.
 *
 * Neither reordering nor resizing is ever pointer-only: the move buttons do the same job as a
 * drag with no drag model at all, and size is a labelled radio group rather than a corner handle.
 * Every control carries the module's name, so a screen-reader user is never left guessing which
 * "Move up" they are on.
 *
 * Two rows by design rather than by accident: at two columns a module is about 170px wide, and
 * five usable targets do not fit on one line at any size worth tapping.
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
  dragHandleRef,
}: CardControlsProps) {
  return (
    <div className="mb-2 flex flex-col gap-1.5 border-b border-line pb-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          ref={dragHandleRef}
          {...dragHandleProps}
          className={HANDLE}
          aria-label={`Reorder ${title}. Position ${position} of ${total}. Press space or enter, then use the arrow keys.`}
        >
          <span aria-hidden="true">⠿</span>
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="ml-auto flex min-h-11 items-center border border-danger-line bg-card px-3 text-[0.625rem] uppercase tracking-[0.14em] text-danger outline-none hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-danger"
          aria-label={`Remove ${title} from the dashboard`}
        >
          Remove
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={onMoveUp} disabled={isFirst} className={NUDGE} aria-label={`Move ${title} earlier`}>
          <span aria-hidden="true">←</span>
        </button>

        <button type="button" onClick={onMoveDown} disabled={isLast} className={NUDGE} aria-label={`Move ${title} later`}>
          <span aria-hidden="true">→</span>
        </button>

        {/* A radio group, not a cycling button: the three sizes are all visible and directly
            reachable, and the current one is announced rather than merely drawn. */}
        <div role="radiogroup" aria-label={`Size of ${title}`} className="ml-auto flex gap-1">
          {CARD_SIZES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="radio"
              aria-checked={size === candidate}
              onClick={() => onSetSize(candidate)}
              className={
                size === candidate
                  ? `${SIZE_CHIP} border border-line-strong bg-accent text-accent-ink`
                  : `${SIZE_CHIP} border border-transparent text-muted hover:bg-accent hover:text-accent-ink`
              }
              aria-label={`${CARD_SIZE_LABEL[candidate]} ${title}`}
            >
              {CARD_SIZE_LABEL[candidate].charAt(0)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
