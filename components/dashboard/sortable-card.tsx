'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WeatherCardDefinition, WeatherCardProps } from '@/components/weather/card-registry';
import { CARD_SIZE_CLASS, type CardLayoutEntry, type CardSize } from '@/lib/weather/card-layout';
import { ModuleBoundary } from '@/components/weather/module-boundary';
import { CardControls } from './card-controls';

interface SortableCardProps {
  definition: WeatherCardDefinition;
  entry: CardLayoutEntry;
  cardProps: WeatherCardProps;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  position: number;
  total: number;
  /** This module is the one waiting to be placed. */
  isLifted: boolean;
  /** Some other module is waiting to be placed, so this one is a destination. */
  isPlacementTarget: boolean;
  /** Name of the module waiting to be placed, for this tile's button label. */
  liftedTitle: string | null;
  /** Drag is hovering this tile, so this is where the module would land. */
  isDropDestination: boolean;
  onToggleLift: () => void;
  onPlaceHere: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetSize: (size: CardSize) => void;
  onRemove: () => void;
}

export function SortableCard({
  definition,
  entry,
  cardProps,
  isEditing,
  isFirst,
  isLast,
  position,
  total,
  isLifted,
  isPlacementTarget,
  liftedTitle,
  isDropDestination,
  onToggleLift,
  onPlaceHere,
  onMoveUp,
  onMoveDown,
  onSetSize,
  onRemove,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: entry.id,
      // Dragging is only possible in edit mode; outside it the module is inert.
      disabled: !isEditing,
    });

  const Component = definition.Component;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // The overlay carries the module while it is lifted, so what is left behind is the hole it
    // came out of rather than a second copy of it.
    opacity: isDragging ? 0.4 : undefined,
  };

  // One treatment for "this is where it lands", whether the module is being dragged there or is
  // waiting to be placed there. Both interactions should teach the same thing.
  const solidAccent = 'outline-2 outline-accent outline-offset-[-2px]';
  let outline = isEditing ? 'outline-1 outline-dashed outline-line-strong outline-offset-2' : '';
  if (isPlacementTarget) outline = 'outline-2 outline-dashed outline-accent outline-offset-[-2px]';
  if (isDropDestination || isLifted) outline = solidAccent;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex min-w-0 flex-col border-b border-r border-line ${CARD_SIZE_CLASS[entry.size]} ${outline}`}
    >
      {isEditing && (
        <CardControls
          title={definition.title}
          size={entry.size}
          isFirst={isFirst}
          isLast={isLast}
          position={position}
          total={total}
          isLifted={isLifted}
          onToggleLift={onToggleLift}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onSetSize={onSetSize}
          onRemove={onRemove}
          dragHandleProps={{ ...attributes, ...listeners }}
          // Separate from the props above because a ref cannot ride along in an HTMLAttributes
          // bag. Without it dnd-kit never learns which element is the activator, and its
          // keyboard guard ("did this event come from the handle?") silently passes for every
          // control in the card.
          dragHandleRef={setActivatorNodeRef}
        />
      )}
      <div className="min-h-0 flex-1">
        {/* Per module, not per page: a throw here costs this tile, not the whole dashboard. */}
        <ModuleBoundary title={definition.title} description={definition.description}>
          <Component {...cardProps} />
        </ModuleBoundary>
      </div>

      {/*
        The gesture-free way to reorder: with a module lifted, every other tile becomes a place to
        put it. A real button, so this path costs a keyboard or screen-reader user nothing extra —
        and, unlike a drag, it can actually be tested on every engine.

        Covers the whole tile rather than sitting inside the layout, so the reading underneath
        stays visible while you choose where the lifted module goes.

        The badge sits at the top because tiles are tall — at the bottom it fell below the fold on
        a phone, which made a live target look merely greyed out. The wash is kept light for the
        same reason: heavy enough to read as "pending", not so heavy the tile looks disabled.
      */}
      {isPlacementTarget && liftedTitle && (
        <button
          type="button"
          onClick={onPlaceHere}
          aria-label={`Move ${liftedTitle} to position ${position} of ${total}, where ${definition.title} is now`}
          className="absolute inset-0 z-10 flex items-start justify-start bg-canvas/25 p-2 outline-none hover:bg-canvas/45 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          <span className="eyebrow border border-line-strong bg-accent px-2 py-1 text-accent-ink">
            Place here
          </span>
        </button>
      )}
    </div>
  );
}
