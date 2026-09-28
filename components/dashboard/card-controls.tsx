'use client';

import { Icon } from '@/components/ui/icon';
import { CARD_SIZES, CARD_SIZE_LABEL, type CardSize } from '@/lib/weather/card-layout';

interface CardControlsProps {
  title: string;
  size: CardSize;
  position: number;
  total: number;
  /** This module is waiting to be placed somewhere. */
  isLifted: boolean;
  onToggleLift: () => void;
  onSetSize: (size: CardSize) => void;
  /** False for a module with exactly one shape (Next Hours): nothing to choose, so nothing to show. */
  sizable?: boolean;
  /** Props from useSortable that turn the handle into a drag/keyboard-drag affordance. */
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
  /** Tells dnd-kit which element is the activator. Kept apart from the props above: a ref cannot
   *  travel inside an HTMLAttributes bag. */
  dragHandleRef: (node: HTMLElement | null) => void;
}

/**
 * The handle does two jobs: hold it and it drags, tap it and the module lifts to be placed with a
 * second tap. They cannot collide — dnd-kit only starts suppressing clicks once its activation
 * constraint is met, so a tap shorter than the hold still produces an ordinary click.
 *
 * `touch-none` is what makes a touch drag possible at all — without it the browser claims the
 * gesture for scrolling — and it is scoped to this button alone, because putting it on the card
 * would stop the page scrolling under a finger. The cost, worth knowing: a swipe that *starts* on
 * the handle neither scrolls nor drags. The tap path means you rarely need to start one here.
 *
 * `touch-callout-none` suppresses the iOS long-press menu, which fires around 500ms and was
 * arriving mid-hold to fight the drag.
 */
const HANDLE =
  'flex h-11 w-11 shrink-0 cursor-grab touch-none select-none [-webkit-touch-callout:none] items-center ' +
  'justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed ' +
  'active:cursor-grabbing';

const SIZE_CHIP =
  'flex h-11 min-w-0 flex-1 items-center justify-center rounded-full type-label-md outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-secondary-fixed';

/**
 * Edit affordances for a single module: the drag handle, and — unless the module has only one
 * shape — the size picker. Reordering is never pointer-only: the handle carries dnd-kit's keyboard
 * sensor (space/enter to lift, arrow keys to move) as well as tap-to-place (tap the handle, then
 * tap a destination tile), so a keyboard or screen-reader user loses nothing by there being no
 * separate move buttons. Removing a module now lives on the module's own header (see
 * components/weather/card-frame.tsx) rather than here, so its icon and its edit affordance sit
 * next to each other instead of in two different places on the tile.
 *
 * Two rows, not one: the handle and three 44px size chips do not fit a ~170px module on the same
 * line (measured — it shrank the chips to 8.6px wide, below the 24px accessibility floor), so the
 * size picker keeps the full row width it always had. It costs height only while arranging.
 */
export function CardControls({
  title,
  size,
  position,
  total,
  isLifted,
  onToggleLift,
  onSetSize,
  sizable = true,
  dragHandleProps,
  dragHandleRef,
}: CardControlsProps) {
  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <button
        type="button"
        ref={dragHandleRef}
        {...dragHandleProps}
        onClick={onToggleLift}
        aria-pressed={isLifted}
        className={`${HANDLE} ${
          isLifted
            ? 'bg-secondary-container text-secondary-fixed'
            : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'
        }`}
        // The label names both routes because which one you get depends on your input, not on a
        // setting. Space or Enter reaches dnd-kit's keyboard drag — its sensor calls
        // preventDefault, which suppresses this button's click, so the two never both fire — and
        // a pointer or touch tap falls through to the click and picks the module up instead.
        aria-label={
          isLifted
            ? `Cancel moving ${title}`
            : `Reorder ${title}. Position ${position} of ${total}. Press space or enter, then use the arrow keys, or tap to pick it up and choose a new slot.`
        }
      >
        <Icon name="drag" size={22} />
      </button>

      {sizable && (
        // A radio group, not a cycling button: the three sizes are all visible and directly
        // reachable, and the current one is announced rather than merely drawn.
        <div
          role="radiogroup"
          aria-label={`Size of ${title}`}
          className="flex gap-0.5 rounded-full bg-surface-container-highest p-0.5"
        >
          {CARD_SIZES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="radio"
              aria-checked={size === candidate}
              onClick={() => onSetSize(candidate)}
              className={
                size === candidate
                  ? `${SIZE_CHIP} bg-secondary-container text-secondary-fixed`
                  : `${SIZE_CHIP} text-on-surface-variant hover:text-primary`
              }
              aria-label={`${CARD_SIZE_LABEL[candidate]} ${title}`}
            >
              {CARD_SIZE_LABEL[candidate].charAt(0)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
