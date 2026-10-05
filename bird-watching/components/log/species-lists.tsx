'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import { buildSpeciesList } from '@/lib/log/life-list';
import { formatStart, useLog } from '@/lib/log/use-log';

interface SpeciesListsProps {
  /** Species with a guide page, so list entries can link to it. */
  guideCodes: string[];
}

/** Life list and year list, newest additions first. */
export function SpeciesLists({ guideCodes }: SpeciesListsProps) {
  const { state } = useLog();
  const [view, setView] = useState<'life' | 'year'>('life');
  const year = new Date().getFullYear();
  const linkable = new Set(guideCodes);

  if (state.status === 'loading') return <p className="type-body-md text-on-surface-variant">Opening your log…</p>;
  if (state.status === 'error') return <p className="type-body-md text-error">{state.message}</p>;

  const entries = buildSpeciesList(state.outings, state.observations, view === 'year' ? year : undefined);
  const views = [
    { id: 'life', label: 'Life list' },
    { id: 'year', label: `${year} list` },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Which list" className="grid grid-cols-2 gap-2">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
            className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-full border type-label-lg ${
              view === v.id ? 'border-secondary-fixed bg-secondary-fixed text-on-secondary' : 'border-outline-variant text-on-surface'
            }`}
          >
            {view === v.id && <Icon name="check" size={16} />}
            {v.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="type-label-lg text-on-surface-variant">
        {entries.length} species
      </p>
      {entries.length === 0 ? (
        <p className="rounded-xl bg-surface-container px-4 py-6 text-center type-body-md text-on-surface-variant">
          No birds logged {view === 'year' ? 'this year ' : ''}yet.{' '}
          <Link href="/log" className="text-secondary-fixed underline">
            Start an outing
          </Link>
          .
        </p>
      ) : (
        <Surface tone="container" className="py-1">
          <ol className="flex flex-col">
            {entries.map((entry) => {
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block type-label-lg text-primary">{entry.commonName}</span>
                    <span className="block type-body-sm text-on-surface-variant">
                      First seen {formatStart(entry.firstSeen)} · {entry.firstArea}
                    </span>
                  </span>
                  <span className="type-label-md text-on-secondary-container">
                    {entry.outings} {entry.outings === 1 ? 'outing' : 'outings'}
                  </span>
                </>
              );
              return (
                <li key={entry.key}>
                  {entry.speciesCode && linkable.has(entry.speciesCode) ? (
                    <Link
                      href={`/guide/${entry.speciesCode}`}
                      className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-container-high"
                    >
                      {body}
                      <Icon name="chevron-right" size={20} className="text-on-surface-variant" />
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 px-3 py-2.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </Surface>
      )}
    </div>
  );
}
