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
import type { CardLayoutEntry, CardSize } from '@/lib/weather/card-layout';
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
  onSetSize: (id: WeatherCardId, size: CardSize) => void;
  onRemove: (id: WeatherCardId) => void;
}

const PLACEHOLDER = 'mt-8 border border-dashed border-line p-10 text-center text-sm text-muted';

export function CardGrid({ cards, isHydrated, cardProps, isEditing, onReorder, onMove, onSetSize, onRemove }: CardGridProps) {
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
      <p role="status" className={PLACEHOLDER}>
        Loading your dashboard…
      </p>
    );
  }

  if (cards.length === 0) {
    return (
      <p role="status" className={PLACEHOLDER}>
        Your dashboard is empty. Open the menu to choose what to show.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cards.map((card) => card.id)} strategy={rectSortingStrategy}>
        {/*
          Two columns on a phone, four from `md` up. A small module is 1x1, medium 2x1, large 2x2 —
          so on a phone medium and large both fill the width, which is the only sensible reading of
          those shapes at that size.

          Rules are drawn by each module's own right and bottom border rather than by a coloured
          background showing through a 1px gap: with the gap trick, any cell the layout leaves
          empty renders as a solid block of rule colour.
        */}
        <div
          className="mt-8 grid auto-rows-[minmax(9.5rem,auto)] grid-cols-2 border-l border-t border-line md:grid-cols-4"
          aria-label="Weather modules"
        >
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
                onSetSize={(size) => onSetSize(entry.id, size)}
                onRemove={() => onRemove(entry.id)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
