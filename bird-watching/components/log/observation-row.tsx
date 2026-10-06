'use client';

import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import { BREEDING_CODES } from '@/lib/log/breeding-codes';
import type { Observation } from '@/lib/log/schema';

interface ObservationRowProps {
  observation: Observation;
  onChange: (patch: Partial<Observation>) => void;
  onRemove: () => void;
}

const stepButton =
  'flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant type-headline-sm text-on-surface hover:bg-surface-container-high disabled:opacity-40';

/** One species on a checklist: big count controls up front, details folded away. */
export function ObservationRow({ observation, onChange, onRemove }: ObservationRowProps) {
  const ids = { comments: useId(), breeding: useId() };
  const name = observation.commonName;
  const counted = observation.count !== null;

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-container p-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 type-label-lg text-primary">{name}</span>
        <button
          type="button"
          className={stepButton}
          aria-label={`One fewer ${name}`}
          disabled={!counted || observation.count === 1}
          onClick={() => onChange({ count: (observation.count ?? 1) - 1 })}
        >
          −
        </button>
        <span className="w-10 text-center type-headline-sm text-primary" aria-live="polite">
          <span className="sr-only">{name} count: </span>
          {counted ? observation.count : 'X'}
        </span>
        <button
          type="button"
          className={stepButton}
          aria-label={`One more ${name}`}
          onClick={() => onChange({ count: (observation.count ?? 0) + 1 })}
        >
          +
        </button>
      </div>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 type-label-md text-secondary-fixed">
          Details{observation.breedingCode ? ` · ${observation.breedingCode}` : ''}
          {observation.comments ? ' · note' : ''}
          <Icon name="expand-more" size={18} className="transition-transform group-open:rotate-180" />
          <span className="sr-only"> for {name}</span>
        </summary>
        <div className="flex flex-col gap-3 pt-1">
          <label className="flex min-h-11 items-center gap-2 type-body-md text-on-surface">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--secondary-fixed)]"
              checked={!counted}
              onChange={(event) => onChange({ count: event.target.checked ? null : 1 })}
            />
            Present, not counted (eBird &ldquo;X&rdquo;)
          </label>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.breeding} className="type-label-md text-on-surface-variant">
              Breeding / behavior code
            </label>
            <select
              id={ids.breeding}
              value={observation.breedingCode ?? ''}
              onChange={(event) => onChange({ breedingCode: event.target.value || null })}
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 type-body-md text-on-surface"
            >
              <option value="">None</option>
              {BREEDING_CODES.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code} — {b.label} ({b.category.toLowerCase()})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.comments} className="type-label-md text-on-surface-variant">
              Notes (age, sex, behavior, how you identified it)
            </label>
            <textarea
              id={ids.comments}
              rows={2}
              value={observation.comments}
              onChange={(event) => onChange({ comments: event.target.value })}
              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 type-body-md text-on-surface"
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-1 self-start rounded-full px-3 type-label-lg text-error hover:bg-error-container"
          >
            <Icon name="close" size={18} />
            Remove {name}
          </button>
        </div>
      </details>
    </li>
  );
}
