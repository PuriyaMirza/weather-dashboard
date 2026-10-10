'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';
import { PhotoThumbButton, type LightboxPhoto } from '@/components/log/photo-lightbox';
import { Surface } from '@/components/ui/surface';
import { ebirdWeek, picksForWeek, type SeasonalPick } from '@/lib/birds/season';

interface AroundThisWeekProps {
  frequencies: Record<string, number[]>;
  names: Record<string, string>;
  /** Credited photos by species code, for whichever birds this week's picks turn out to be. */
  photos: Record<string, LightboxPhoto>;
}

const subscribe = () => () => {};
/** -1 on the server so the prerendered page never bakes in the build date's week. */
const clientWeek = () => ebirdWeek(new Date());
const serverWeek = () => -1;

type ListProps = Pick<AroundThisWeekProps, 'names' | 'photos'> & { title: string; hint: string; picks: SeasonalPick[] };

function PickList({ title, hint, picks, names, photos }: ListProps) {
  if (picks.length === 0) return null;
  return (
    <Surface tone="container" className="p-4">
      <h3 className="type-label-lg text-primary">{title}</h3>
      <p className="type-body-sm text-on-surface-variant">{hint}</p>
      <ul className="mt-2 flex flex-col">
        {picks.map((pick) => (
          <li key={pick.code} className="flex min-h-[67px] items-center gap-3 py-1">
            {photos[pick.code] ? (
              <PhotoThumbButton photo={photos[pick.code]} commonName={names[pick.code] ?? pick.code} className="h-12 w-12" />
            ) : (
              <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded-lg bg-surface-container-highest" />
            )}
            <Link href={`/guide/${pick.code}`} className="min-w-0 flex-1 type-label-lg text-primary underline-offset-2 hover:underline">
              {names[pick.code] ?? pick.code}
            </Link>
            <span className="shrink-0 type-body-sm text-on-surface-variant">{Math.round(pick.frequency * 100)}% of checklists</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

/**
 * What to expect this week, from ten-plus years of eBird checklists. Frequency is shown as words and
 * a percentage, never as a bar alone, so nothing relies on colour.
 */
export function AroundThisWeek({ frequencies, names, photos }: AroundThisWeekProps) {
  const week = useSyncExternalStore(subscribe, clientWeek, serverWeek);
  const picks = useMemo(() => (week < 0 ? null : picksForWeek(frequencies, week)), [frequencies, week]);

  if (!picks) return <div className="h-40 rounded-xl bg-surface-container" aria-hidden />;
  return (
    <div className="flex flex-col gap-3">
      <PickList title="Most likely this week" hint="Birds reported on the most checklists right now." picks={picks.likely} names={names} photos={photos} />
      <PickList title="Just arriving" hint="Rarer three weeks ago, getting common now." picks={picks.arriving} names={names} photos={photos} />
    </div>
  );
}
