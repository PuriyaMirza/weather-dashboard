'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WeatherCardDefinition, WeatherCardProps } from '@/components/weather/card-registry';
import {
  CARD_SIZE_CLASS,
  FULL_WIDTH_CARD_IDS,
  FULL_WIDTH_CLASS,
  type CardLayoutEntry,
  type CardSize,
} from '@/lib/weather/card-layout';
import { Icon } from '@/components/ui/icon';
import { ModuleBoundary } from '@/components/weather/module-boundary';
import { CardControls } from './card-controls';

interface SortableCardProps {
  definition: WeatherCardDefinition;
  entry: CardLayoutEntry;
  cardProps: WeatherCardProps;
  isEditing: boolean;
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
  onSetSize: (size: CardSize) => void;
  onRemove: () => void;
}

export function SortableCard({
  definition,
  entry,
  cardProps,
  isEditing,
  position,
  total,
  isLifted,
  isPlacementTarget,
  liftedTitle,
  isDropDestination,
  onToggleLift,
  onPlaceHere,
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
  const isFullWidth = FULL_WIDTH_CARD_IDS.has(entry.id);
  const sizeClass = isFullWidth ? FULL_WIDTH_CLASS : CARD_SIZE_CLASS[entry.size];

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // The overlay carries the module while it is lifted, so what is left behind is the hole it
    // came out of rather than a second copy of it.
    opacity: isDragging ? 0.4 : undefined,
  };

  // One treatment for "this is where it lands", whether the module is being dragged there or is
  // waiting to be placed there. Both interactions should teach the same thing. The outline lives on
  // this element because it carries the radius — an outline follows its own element's corners, so
  // a square wrapper would draw a square ring around a rounded module.
  const solidAccent = 'outline-2 outline-secondary-fixed outline-offset-2';
  let outline = isEditing ? 'outline-2 outline-dashed outline-secondary/60 outline-offset-2' : '';
  if (isPlacementTarget) outline = 'outline-2 outline-dashed outline-secondary-fixed outline-offset-2';
  if (isDropDestination || isLifted) outline = solidAccent;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex min-w-0 flex-col rounded-xl ${sizeClass} ${outline}`}
    >
      {isEditing && (
        <CardControls
          title={definition.title}
          size={entry.size}
          position={position}
          total={total}
          isLifted={isLifted}
          onToggleLift={onToggleLift}
          onSetSize={onSetSize}
          sizable={!isFullWidth}
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
          <Component {...cardProps} isEditing={isEditing} onRemove={onRemove} />
        </ModuleBoundary>
      </div>

      {/*
        The gesture-free way to reorder: with a module lifted, every other tile becomes a place to
        put it. A real button, so this path costs a keyboard or screen-reader user nothing extra —
        and, unlike a drag, it can actually be tested on every engine.

        Covers the whole tile rather than sitting inside the layout, so the reading underneath
        stays visible while you choose where the lifted module goes. Clipped to the module's radius so
        the wash does not paint square corners over a rounded card.

        The badge sits at the top because tiles are tall — at the bottom it fell below the fold on
        a phone, which made a live target look merely greyed out. The wash is kept light for the
        same reason: heavy enough to read as "pending", not so heavy the tile looks disabled.
      */}
      {isPlacementTarget && liftedTitle && (
        <button
          type="button"
          onClick={onPlaceHere}
          aria-label={`Move ${liftedTitle} to position ${position} of ${total}, where ${definition.title} is now`}
          className="absolute inset-0 z-10 flex items-start justify-start overflow-hidden rounded-xl bg-surface/40 p-2 outline-none hover:bg-surface/60 focus-visible:ring-2 focus-visible:ring-secondary-fixed focus-visible:ring-inset"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1.5 type-label-md text-secondary-fixed shadow-card">
            <Icon name="touch" size={14} />
            Place here
          </span>
        </button>
      )}
    </div>
  );
}
