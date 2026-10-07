'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import { parkToday } from '@/lib/forecast/birding-outlook';
import { whenObserved } from '@/lib/live/format';
import type { RareHighlightResponse } from '@/lib/live/rare-highlight';
import { useApi } from '@/lib/live/use-api';

/**
 * The Today page's lead image: a rare bird reported in the park this week, shown with a credited
 * photo of its species. Decoration on top of the live sightings list, not a replacement for it —
 * so on an error, or a week with no photographable rarity, it steps aside rather than taking up
 * the top of the page with a message the sightings section already gives.
 */
export function RareBirdHero({ guideCodes }: { guideCodes: string[] }) {
  const { state } = useApi<RareHighlightResponse>('/api/rare-highlight');

  if (state.status === 'loading') {
    return (
      <Surface tone="container" role="status" className="aspect-[4/3] animate-pulse">
        <span className="sr-only">Looking for rare birds in the park…</span>
      </Surface>
    );
  }
  if (state.status === 'error' || !state.data.highlight) return null;

  const { sighting, photo } = state.data.highlight;
  const inGuide = guideCodes.includes(sighting.speciesCode);
  return (
    <section aria-labelledby="rare-hero" className="overflow-hidden rounded-2xl bg-surface-container shadow-card">
      <figure>
        <div className="relative aspect-[4/3] bg-surface-container-high">
          <Image
            src={photo.src}
            alt={`${sighting.commonName}, a representative photo of the species`}
            fill
            priority
            sizes="(min-width: 672px) 640px, 100vw"
            className="object-cover"
          />
        </div>
        <figcaption className="px-4 pt-2 type-body-sm text-on-surface-variant">
          Photo of the species, not this sighting: {photo.artist} ·{' '}
          {photo.licenseUrl ? (
            <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-2">
              {photo.license}
            </a>
          ) : (
            photo.license
          )}{' '}
          ·{' '}
          <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Wikimedia Commons<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </figcaption>
      </figure>
      <div className="flex flex-col gap-2 p-4 pt-3">
        <span className="self-start rounded-full bg-scale-5-bg px-2 py-0.5 type-label-sm text-scale-5">
          Rare here{sighting.unconfirmed ? ' · unconfirmed' : ''}
        </span>
        <h2 id="rare-hero" className="type-headline-md text-primary">
          {inGuide ? (
            <Link href={`/guide/${sighting.speciesCode}`} className="underline-offset-4 hover:underline">
              {sighting.commonName}
            </Link>
          ) : (
            sighting.commonName
          )}
        </h2>
        <p className="type-body-md text-on-surface">
          Reported at {sighting.area} · {whenObserved(sighting.observedAt, parkToday())}
          {sighting.count !== null && sighting.count > 1 ? ` · ${sighting.count} seen` : ''}
        </p>
        {sighting.unconfirmed && (
          <p className="type-body-sm text-on-surface-variant">eBird&rsquo;s reviewers haven&rsquo;t confirmed this report yet.</p>
        )}
        <a
          href={sighting.checklistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-2 self-start type-label-lg text-secondary-fixed underline-offset-2 hover:underline"
        >
          <Icon name="link" size={18} />
          See the eBird checklist<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
