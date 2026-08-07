'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WeatherCardDefinition, WeatherCardProps } from '@/components/weather/card-registry';
import type { CardLayoutEntry } from '@/lib/weather/card-layout';
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
  onToggleSpan: () => void;
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
  onToggleSpan,
  onRemove,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    // Dragging is only possible in edit mode; outside it the card is inert.
    disabled: !isEditing,
  });

  const Component = definition.Component;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Lifted card sits above its neighbours while dragging.
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${entry.span === 'wide' ? 'lg:col-span-2' : ''} ${
        isEditing ? 'rounded-3xl outline-2 outline-dashed outline-sky-400 outline-offset-4' : ''
      }`}
    >
      {isEditing && (
        <CardControls
          title={definition.title}
          span={entry.span}
          isFirst={isFirst}
          isLast={isLast}
          position={position}
          total={total}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onToggleSpan={onToggleSpan}
          onRemove={onRemove}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      )}
      <Component {...cardProps} />
    </div>
  );
}
