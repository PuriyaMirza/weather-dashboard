'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getCardDefinition, type WeatherCardId, type WeatherCardProps } from '@/components/weather/card-registry';
import { SectionHeader } from '@/components/ui/section-header';
import { THEMES } from '@/lib/theme';
import type { CardLayoutEntry, CardSize } from '@/lib/weather/card-layout';
import { useDashboardStore } from '@/store/dashboard-store';
import { SortableCard } from './sortable-card';

interface CardGridProps {
  cards: CardLayoutEntry[];
  /** False until persisted preferences load; the grid shows a neutral placeholder rather than
   *  either the default layout (which would flash) or an "empty dashboard" message (which is wrong). */
  isHydrated: boolean;
  cardProps: WeatherCardProps;
  isEditing: boolean;
  onReorder: (orderedIds: WeatherCardId[]) => void;
  onSetSize: (id: WeatherCardId, size: CardSize) => void;
  onRemove: (id: WeatherCardId) => void;
  /** Lets the dashboard know a drag is in flight, so Escape cancels the drag rather than leaving
   *  arrange mode. */
  onDragActiveChange: (isDragActive: boolean) => void;
  /**
   * The module waiting to be placed, owned by the dashboard rather than here: the toolbar's Cancel
   * and the Escape key both need to control it, and a state two outsiders drive does not belong
   * behind a callback ref.
   */
  liftedId: WeatherCardId | null;
  onToggleLift: (id: WeatherCardId) => void;
  onPlaceAt: (targetId: WeatherCardId) => void;
}

const PLACEHOLDER =
  'rounded-xl border border-dashed border-outline-variant p-10 text-center type-body-sm text-on-surface-variant';

export function CardGrid({
  cards,
  isHydrated,
  cardProps,
  isEditing,
  onReorder,
  onSetSize,
  onRemove,
  onDragActiveChange,
  liftedId,
  onToggleLift,
  onPlaceAt,
}: CardGridProps) {
  const theme = useDashboardStore((state) => state.theme);
  const [activeId, setActiveId] = useState<WeatherCardId | null>(null);
  const [overId, setOverId] = useState<WeatherCardId | null>(null);
  const sensors = useSensors(
    // A small distance threshold keeps a click on the handle from being read as a drag, which
    // would otherwise make the button's own activation unreliable.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch is a separate sensor rather than PointerSensor covering both, because only a
    // registered sensor's setup() runs and TouchSensor's is the one that installs the
    // non-passive touchmove listener iOS Safari needs for preventDefault to bite. It also wants
    // a hold rather than a distance: the first pixels of finger travel are ambiguous between
    // "scroll the page" and "drag this", and losing that race is why dragging never worked on a
    // phone. `tolerance` abandons the pending lift if the finger moves first, so a flick that
    // starts on the handle still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    // Gives the same reordering to keyboard users: space/enter to lift, arrows to move, escape to
    // cancel — dnd-kit announces each step through its own live region.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // "What is under the pointer" is the honest answer when modules differ in size: a 2x2 tile's
  // centre can be nowhere near the finger, so closestCenter alone routinely targets the wrong
  // neighbour. It stays as the fallback because pointerWithin returns nothing for a keyboard drag
  // (there is no pointer) and nothing when the pointer sits in a gutter between tiles.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const under = pointerWithin(args);
    return under.length > 0 ? under : closestCenter(args);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as WeatherCardId);
    onDragActiveChange(true);
  }

  function endDrag() {
    setActiveId(null);
    setOverId(null);
    onDragActiveChange(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    endDrag();

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = cards.findIndex((card) => card.id === active.id);
    const to = cards.findIndex((card) => card.id === over.id);
    if (from < 0 || to < 0) return;

    onReorder(arrayMove(cards, from, to).map((card) => card.id));
  }

  // Outside the labelled grid on purpose: the e2e suite reads module order from the grid's own
  // headings, and the theme's title is not a module.
  const header = <SectionHeader title={THEMES[theme].gridTitle} meta="Live" className="mb-3" />;

  if (!isHydrated) {
    return (
      <div>
        {header}
        <p role="status" className={PLACEHOLDER}>
          Loading your dashboard…
        </p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div>
        {header}
        <p role="status" className={PLACEHOLDER}>
          Your dashboard is empty. Open the menu to choose what to show.
        </p>
      </div>
    );
  }

  return (
    <div>
      {header}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={(event) => setOverId((event.over?.id as WeatherCardId) ?? null)}
        onDragEnd={handleDragEnd}
        onDragCancel={endDrag}
      >
        {/*
          No sorting strategy, deliberately. rectSortingStrategy derives neighbour displacement
          assuming every item is the same size, which is false here — modules are 1x1, 2x1 and 2x2 —
          so the preview was approximate and tiles visibly jumped. Worse, neighbours sliding aside
          depicts a *swap*, while the committed operation is arrayMove: an *insert*. Even an accurate
          version would have been describing the wrong verb. The destination outline below says where
          the module actually lands instead.
        */}
        <SortableContext items={cards.map((card) => card.id)} strategy={() => null}>
          {/*
            Two columns on a phone, four from `md` up. A small module is 1x1, medium 2x1, large 2x2 —
            so on a phone medium and large both fill the width, which is the only sensible reading of
            those shapes at that size.
          */}
          <div
            className={`grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 ${
              // Arranging adds two rows of controls to every module; without more room the reading
              // underneath gets squeezed to nothing on a small tile. The gaps give arranging its own
              // breathing room too, since the dashed outlines sit in them.
              isEditing ? 'auto-rows-[minmax(14rem,auto)]' : 'auto-rows-[minmax(10rem,auto)]'
            }`}
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
                  position={index + 1}
                  total={cards.length}
                  isLifted={liftedId === entry.id}
                  isPlacementTarget={liftedId !== null && liftedId !== entry.id}
                  liftedTitle={liftedId ? (getCardDefinition(liftedId)?.title ?? null) : null}
                  isDropDestination={activeId !== null && overId === entry.id && activeId !== entry.id}
                  onToggleLift={() => onToggleLift(entry.id)}
                  onPlaceHere={() => onPlaceAt(entry.id)}
                  onSetSize={(size) => onSetSize(entry.id, size)}
                  onRemove={() => onRemove(entry.id)}
                />
              );
            })}
          </div>
        </SortableContext>

        {/* A proxy, not the real module: DragOverlay sizes itself to the lifted card's measured rect,
            so a title in a frame inherits the right footprint without mounting a second live chart
            mid-drag. It floats above the sticky toolbar, which is what you want on touch — the thing
            you are carrying should not hide under the chrome. */}
        <DragOverlay modifiers={[restrictToWindowEdges]}>
          {activeId ? (
            <div className="flex h-full w-full cursor-grabbing items-center justify-center rounded-xl bg-surface-container-highest px-4 shadow-raised outline-2 outline-secondary-fixed">
              <span className="type-label-lg text-primary">{getCardDefinition(activeId)?.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
