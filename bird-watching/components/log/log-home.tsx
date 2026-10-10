'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { Surface } from '@/components/ui/surface';
import { exportBackup, importBackup } from '@/lib/log/backup';
import { toEbirdCsv } from '@/lib/log/ebird-csv';
import { newOuting } from '@/lib/log/factory';
import { buildSpeciesList } from '@/lib/log/life-list';
import { downloadFile, formatStart, useLog } from '@/lib/log/use-log';
import { getRepository } from '@/lib/log/use-repository';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The log's front page: start an outing, see past ones, and get your data in and out. */
export function LogHome() {
  const router = useRouter();
  const { state, reload } = useLog();
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function startOuting() {
    const outing = newOuting();
    await getRepository().repo.saveOuting(outing);
    router.push(`/log/outing?id=${outing.id}`);
  }

  async function restore(file: File) {
    try {
      const result = await importBackup(getRepository().repo, JSON.parse(await file.text()));
      setMessage(`Restored ${result.outings} outings and ${result.observations} sightings.`);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error && !(error instanceof SyntaxError) ? error.message : "That file isn't a Central Park Birding backup.");
    }
  }

  if (state.status === 'loading') return <p className="type-body-md text-on-surface-variant">Opening your log…</p>;
  if (state.status === 'error') return <p className="type-body-md text-error">{state.message}</p>;

  const { outings, observations } = state;
  const speciesCount = (outingId: string) =>
    new Set(observations.filter((o) => o.outingId === outingId).map((o) => o.speciesCode ?? o.commonName)).size;
  const lifeCount = buildSpeciesList(outings, observations).length;
  const yearCount = buildSpeciesList(outings, observations, new Date().getFullYear()).length;
  const { persistent } = getRepository();

  return (
    <div className="flex flex-col gap-6">
      {!persistent && (
        <p role="alert" className="rounded-xl bg-error-container px-4 py-3 type-body-md text-on-error-container">
          This browser isn&rsquo;t letting the app save data, so your log will be lost when you close the tab.
        </p>
      )}

      <button
        type="button"
        onClick={startOuting}
        className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-secondary-fixed px-4 type-label-lg text-on-secondary"
      >
        <Icon name="add" size={22} />
        Start an outing
      </button>

      <Link
        href="/log/photo"
        className="-mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 type-label-lg text-on-surface hover:bg-surface-container-high"
      >
        <Icon name="visibility" size={20} />
        Add a bird from a photo
      </Link>

      <Link href="/log/lists" className="block">
        <Surface tone="container" className="grid grid-cols-3 divide-x divide-outline-variant/60 py-3 text-center hover:bg-surface-container-high">
          <span className="flex flex-col">
            <span className="type-headline-md text-primary">{lifeCount}</span>
            <span className="type-label-md text-on-surface-variant">Life list</span>
          </span>
          <span className="flex flex-col">
            <span className="type-headline-md text-primary">{yearCount}</span>
            <span className="type-label-md text-on-surface-variant">This year</span>
          </span>
          <span className="flex flex-col">
            <span className="type-headline-md text-primary">{outings.length}</span>
            <span className="type-label-md text-on-surface-variant">Outings</span>
          </span>
        </Surface>
        <span className="mt-1 flex items-center justify-end gap-1 type-label-md text-secondary-fixed">
          See your lists <Icon name="chevron-right" size={16} />
        </span>
      </Link>

      <section aria-labelledby="outings" className="flex flex-col gap-2">
        <SectionHeader id="outings" title="Outings" />
        {outings.length === 0 ? (
          <p className="rounded-xl bg-surface-container px-4 py-6 text-center type-body-md text-on-surface-variant">
            No outings yet. Start one when you enter the park and add birds as you see them.
          </p>
        ) : (
          <Surface tone="container" className="py-1">
            <ul className="flex flex-col">
              {outings.map((outing) => (
                <li key={outing.id}>
                  <Link
                    href={`/log/outing?id=${outing.id}`}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-container-high"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block type-label-lg text-primary">{formatStart(outing.startTime)}</span>
                      <span className="block type-body-sm text-on-surface-variant">{outing.area}</span>
                    </span>
                    <span className="type-label-md text-on-secondary-container">{speciesCount(outing.id)} species</span>
                    <Icon name="chevron-right" size={20} className="text-on-surface-variant" />
                  </Link>
                </li>
              ))}
            </ul>
          </Surface>
        )}
      </section>

      <section aria-labelledby="your-data" className="flex flex-col gap-2">
        <SectionHeader id="your-data" title="Your data" />
        <p className="type-body-sm text-on-surface-variant">
          Your log lives only on this device. Upload the eBird file at ebird.org/import (format: &ldquo;eBird Record
          Format (Extended)&rdquo;), and keep a backup in case you clear your browser.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={observations.length === 0}
            onClick={() => downloadFile(`central-park-ebird-${today()}.csv`, toEbirdCsv(outings, observations), 'text/csv')}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant px-4 type-label-lg text-on-surface hover:bg-surface-container-high disabled:opacity-50"
          >
            Export for eBird
          </button>
          <button
            type="button"
            onClick={async () =>
              downloadFile(
                `central-park-birding-backup-${today()}.json`,
                JSON.stringify(await exportBackup(getRepository().repo), null, 2),
                'application/json',
              )
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant px-4 type-label-lg text-on-surface hover:bg-surface-container-high"
          >
            Download backup
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant px-4 type-label-lg text-on-surface hover:bg-surface-container-high"
          >
            Restore backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Backup file to restore"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void restore(file);
              event.target.value = '';
            }}
          />
        </div>
        {message && (
          <p role="status" className="type-body-md text-on-surface">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
