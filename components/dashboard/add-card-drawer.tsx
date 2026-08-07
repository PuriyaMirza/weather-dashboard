'use client';

import { useEffect, useRef } from 'react';
import { weatherCardRegistry, type WeatherCardId } from '@/components/weather/card-registry';

interface AddCardDrawerProps {
  isOpen: boolean;
  activeCardIds: WeatherCardId[];
  onAdd: (id: WeatherCardId) => void;
  onClose: () => void;
}

/**
 * Panel listing the cards not currently on the dashboard.
 *
 * Focus is moved into the panel when it opens and Escape closes it, so a keyboard user is never
 * stranded — the panel is rendered inline rather than as a modal dialog, so focus is deliberately
 * not trapped: tabbing past the end should continue into the dashboard, not loop.
 */
export function AddCardDrawer({ isOpen, activeCardIds, onAdd, onClose }: AddCardDrawerProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const available = weatherCardRegistry.filter((card) => !activeCardIds.includes(card.id));

  useEffect(() => {
    if (isOpen) headingRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <section
      aria-labelledby="add-card-heading"
      className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="add-card-heading" tabIndex={-1} className="text-base font-semibold text-slate-900 outline-none">
          Add a card
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-600"
        >
          Close
        </button>
      </div>

      {available.length === 0 ? (
        <p role="status" className="mt-3 text-sm text-slate-600">
          Every available card is already on your dashboard.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {available.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => onAdd(card.id)}
                className="w-full rounded-xl border border-slate-200 p-3 text-left outline-none hover:border-sky-500 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                <span className="block text-sm font-semibold text-slate-900">Add {card.title}</span>
                <span className="mt-0.5 block text-xs text-slate-600">{card.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
