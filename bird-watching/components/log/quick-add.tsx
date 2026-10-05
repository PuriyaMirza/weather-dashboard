'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import type { SpeciesOption } from '@/lib/birds/schema';
import { quickMatches } from '@/lib/birds/search';

interface QuickAddProps {
  options: SpeciesOption[];
  onAdd: (species: { code: string | null; commonName: string; scientificName: string | null }) => void;
}

/**
 * Type a few letters or a banding code, tap the bird. Results are plain buttons rather than an
 * ARIA combobox: fewer moving parts, and they work the same with a screen reader, a keyboard, or
 * a thumb in a glove.
 */
export function QuickAdd({ options, onAdd }: QuickAddProps) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const matches = quickMatches(options, query);
  const trimmed = query.trim();

  function add(species: Parameters<QuickAddProps['onAdd']>[0]) {
    onAdd(species);
    setQuery('');
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="type-label-lg text-on-surface">
        Add a bird
      </label>
      <div className="relative">
        <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && matches[0]) {
              event.preventDefault();
              add({ code: matches[0].code, commonName: matches[0].commonName, scientificName: matches[0].scientificName });
            }
          }}
          placeholder="Name or code, e.g. NOCA"
          autoComplete="off"
          enterKeyHint="done"
          className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-low pl-10 pr-3 type-body-md text-on-surface placeholder:text-on-surface-variant"
        />
      </div>
      {trimmed && (
        <ul aria-label="Matching birds" className="flex flex-col gap-1">
          {matches.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                onClick={() => add({ code: option.code, commonName: option.commonName, scientificName: option.scientificName })}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-surface-container px-3 text-left hover:bg-surface-container-high"
              >
                <Icon name="add" size={20} className="text-secondary-fixed" />
                <span className="flex-1 type-label-lg text-primary">{option.commonName}</span>
                {option.bandingCode && <span className="type-label-sm text-on-secondary-container">{option.bandingCode}</span>}
              </button>
            </li>
          ))}
          {trimmed.length >= 3 && (
            <li>
              <button
                type="button"
                onClick={() => add({ code: null, commonName: trimmed, scientificName: null })}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-dashed border-outline-variant px-3 text-left type-body-md text-on-surface hover:bg-surface-container-high"
              >
                <Icon name="add" size={20} className="text-secondary-fixed" />
                Add &ldquo;{trimmed}&rdquo; as written
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
