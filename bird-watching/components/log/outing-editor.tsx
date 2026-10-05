'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { Surface } from '@/components/ui/surface';
import type { SpeciesOption } from '@/lib/birds/schema';
import { toEbirdCsv } from '@/lib/log/ebird-csv';
import { newObservation } from '@/lib/log/factory';
import { nowIso } from '@/lib/log/repository';
import type { Observation, Outing } from '@/lib/log/schema';
import { downloadFile, formatStart } from '@/lib/log/use-log';
import { getRepository } from '@/lib/log/use-repository';
import { ObservationRow } from './observation-row';
import { OutingDetails } from './outing-details';
import { QuickAdd } from './quick-add';

interface OutingEditorProps {
  species: SpeciesOption[];
}

type Loaded = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; outing: Outing; observations: Observation[] };

/**
 * One outing's checklist. Every change saves immediately — there is no Save button to forget
 * when your phone locks in your pocket.
 */
export function OutingEditor({ species }: OutingEditorProps) {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const taxonOrder = useMemo(() => new Map(species.map((s) => [s.code, s.taxonOrder])), [species]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { repo } = getRepository();
      const outing = id ? await repo.getOuting(id) : undefined;
      if (cancelled) return;
      if (!outing) return setLoaded({ status: 'missing' });
      setLoaded({ status: 'ready', outing, observations: await repo.listObservations(outing.id) });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loaded.status === 'loading') return <p className="type-body-md text-on-surface-variant">Opening outing…</p>;
  if (loaded.status === 'missing')
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="type-headline-md text-primary">Outing not found</h1>
        <p className="type-body-md text-on-surface-variant">It may have been deleted, or it was saved on another device.</p>
        <Link href="/log" className="type-label-lg text-secondary-fixed underline">
          Back to your log
        </Link>
      </div>
    );

  const { outing, observations } = loaded;
  const { repo } = getRepository();
  const sorted = [...observations].sort(
    (a, b) =>
      (taxonOrder.get(a.speciesCode ?? '') ?? Infinity) - (taxonOrder.get(b.speciesCode ?? '') ?? Infinity) ||
      a.commonName.localeCompare(b.commonName),
  );
  const totalBirds = observations.reduce((sum, o) => sum + (o.count ?? 0), 0);

  function updateOuting(patch: Partial<Outing>) {
    const next = { ...outing, ...patch, updatedAt: nowIso() };
    setLoaded({ status: 'ready', outing: next, observations });
    void repo.saveOuting(next);
  }

  function updateObservation(target: Observation, patch: Partial<Observation>) {
    const next = { ...target, ...patch, updatedAt: nowIso() };
    setLoaded({ status: 'ready', outing, observations: observations.map((o) => (o.id === target.id ? next : o)) });
    void repo.saveObservation(next);
  }

  function addSpecies(entry: { code: string | null; commonName: string; scientificName: string | null }) {
    // Adding a bird that's already on the list counts one more instead of making a duplicate row.
    const existing = observations.find((o) =>
      entry.code ? o.speciesCode === entry.code : o.commonName.toLowerCase() === entry.commonName.toLowerCase(),
    );
    if (existing) return updateObservation(existing, { count: existing.count === null ? null : existing.count + 1 });
    const obs = newObservation(outing.id, entry);
    setLoaded({ status: 'ready', outing, observations: [...observations, obs] });
    void repo.saveObservation(obs);
  }

  function removeObservation(target: Observation) {
    setLoaded({ status: 'ready', outing, observations: observations.filter((o) => o.id !== target.id) });
    void repo.deleteObservation(target.id);
  }

  async function deleteOuting() {
    if (!window.confirm('Delete this outing and all its sightings?')) return;
    await repo.deleteOuting(outing.id);
    router.push('/log');
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/log" className="inline-flex min-h-11 items-center gap-1 self-start pr-3 type-label-lg text-secondary-fixed">
        <Icon name="arrow-back" size={20} />
        Your log
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="type-headline-md text-primary">{outing.area}</h1>
        <p className="type-body-md text-on-surface-variant">
          {formatStart(outing.startTime)} · {observations.length} species, {totalBirds} birds counted
        </p>
      </header>

      <QuickAdd options={species} onAdd={addSpecies} />

      <section aria-labelledby="checklist" className="flex flex-col gap-2">
        <SectionHeader id="checklist" title="Checklist" meta={`${observations.length} species`} />
        {sorted.length === 0 ? (
          <p className="rounded-xl bg-surface-container px-4 py-6 text-center type-body-md text-on-surface-variant">
            Nothing yet. Add birds as you see or hear them.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((obs) => (
              <ObservationRow
                key={obs.id}
                observation={obs}
                onChange={(patch) => updateObservation(obs, patch)}
                onRemove={() => removeObservation(obs)}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="details" className="flex flex-col gap-2">
        <SectionHeader id="details" title="Outing details" />
        <Surface tone="container" className="p-4">
          <OutingDetails outing={outing} onChange={updateOuting} />
        </Surface>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={observations.length === 0}
          onClick={() =>
            downloadFile(`ebird-${outing.startTime.slice(0, 10)}-${outing.id.slice(0, 8)}.csv`, toEbirdCsv([outing], observations), 'text/csv')
          }
          className="inline-flex min-h-11 items-center rounded-full border border-outline-variant px-4 type-label-lg text-on-surface hover:bg-surface-container-high disabled:opacity-50"
        >
          Export this checklist for eBird
        </button>
        <button
          type="button"
          onClick={deleteOuting}
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-4 type-label-lg text-error hover:bg-error-container"
        >
          <Icon name="close" size={18} />
          Delete outing
        </button>
      </div>
    </div>
  );
}
