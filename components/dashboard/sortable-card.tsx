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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex min-w-0 flex-col border-b border-r border-line ${CARD_SIZE_CLASS[entry.size]} ${
        isEditing ? 'outline-1 outline-dashed outline-line-strong outline-offset-2' : ''
      }`}
    >
      {isEditing && (
        <CardControls
          title={definition.title}
          size={entry.size}
          isFirst={isFirst}
          isLast={isLast}
          position={position}
          total={total}
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
    </div>
  );
}
