'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getCardDefinition, type WeatherCardId, type WeatherCardProps } from '@/components/weather/card-registry';
import type { CardLayoutEntry, CardSpan } from '@/lib/weather/card-layout';
import { SortableCard } from './sortable-card';

interface CardGridProps {
  cards: CardLayoutEntry[];
  /** False until persisted preferences load; the grid shows a neutral placeholder rather than
   *  either the default layout (which would flash) or an "empty dashboard" message (which is wrong). */
  isHydrated: boolean;
  cardProps: WeatherCardProps;
  isEditing: boolean;
  onReorder: (orderedIds: WeatherCardId[]) => void;
  onMove: (id: WeatherCardId, direction: -1 | 1) => void;
  onSetSpan: (id: WeatherCardId, span: CardSpan) => void;
  onRemove: (id: WeatherCardId) => void;
}

export function CardGrid({ cards, isHydrated, cardProps, isEditing, onReorder, onMove, onSetSpan, onRemove }: CardGridProps) {
  const sensors = useSensors(
    // A small distance threshold keeps a click on the handle from being read as a drag, which
    // would otherwise make the button's own activation unreliable.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Gives the same reordering to keyboard users: space/enter to lift, arrows to move, escape to
    // cancel — dnd-kit announces each step through its own live region.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = cards.findIndex((card) => card.id === active.id);
    const to = cards.findIndex((card) => card.id === over.id);
    if (from < 0 || to < 0) return;

    onReorder(arrayMove(cards, from, to).map((card) => card.id));
  }

  if (!isHydrated) {
    return (
      <p role="status" className="mt-6 rounded-2xl border border-dashed border-line-strong bg-card p-8 text-center text-sm text-muted">
        Loading your dashboard…
      </p>
    );
  }

  if (cards.length === 0) {
    return (
      <p role="status" className="mt-6 rounded-2xl border border-dashed border-line-strong bg-card p-8 text-center text-sm text-muted">
        Your dashboard is empty. Use “Add a card” to choose what to show.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cards.map((card) => card.id)} strategy={rectSortingStrategy}>
        <div className="mt-6 grid gap-5 lg:grid-cols-2" aria-label="Weather cards">
          {cards.map((entry, index) => {
            const definition = getCardDefinition(entry.id);
            if (!definition) return null;

            return (
              <SortableCard
                key={entry.id}
                definition={definition}
                entry={entry}
                cardProps={cardProps}
                isEditing={isEditing}
                isFirst={index === 0}
                isLast={index === cards.length - 1}
                position={index + 1}
                total={cards.length}
                onMoveUp={() => onMove(entry.id, -1)}
                onMoveDown={() => onMove(entry.id, 1)}
                onToggleSpan={() => onSetSpan(entry.id, entry.span === 'wide' ? 'single' : 'wide')}
                onRemove={() => onRemove(entry.id)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
