'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';
import { Surface } from '@/components/ui/surface';
import { ebirdWeek, picksForWeek, type SeasonalPick } from '@/lib/birds/season';

interface AroundThisWeekProps {
  frequencies: Record<string, number[]>;
  names: Record<string, string>;
}

const subscribe = () => () => {};
/** -1 on the server so the prerendered page never bakes in the build date's week. */
const clientWeek = () => ebirdWeek(new Date());
const serverWeek = () => -1;

function PickList({ title, hint, picks, names }: { title: string; hint: string; picks: SeasonalPick[]; names: Record<string, string> }) {
  if (picks.length === 0) return null;
  return (
    <Surface tone="container" className="p-4">
      <h3 className="type-label-lg text-primary">{title}</h3>
      <p className="type-body-sm text-on-surface-variant">{hint}</p>
      <ul className="mt-2 flex flex-col">
        {picks.map((pick) => (
          <li key={pick.code} className="flex min-h-11 items-center justify-between gap-3">
            <Link href={`/guide/${pick.code}`} className="type-label-lg text-primary underline-offset-2 hover:underline">
              {names[pick.code] ?? pick.code}
            </Link>
            <span className="type-body-sm text-on-surface-variant">{Math.round(pick.frequency * 100)}% of checklists</span>
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
export function AroundThisWeek({ frequencies, names }: AroundThisWeekProps) {
  const week = useSyncExternalStore(subscribe, clientWeek, serverWeek);
  const picks = useMemo(() => (week < 0 ? null : picksForWeek(frequencies, week)), [frequencies, week]);

  if (!picks) return <div className="h-40 rounded-xl bg-surface-container" aria-hidden />;
  return (
    <div className="flex flex-col gap-3">
      <PickList title="Most likely this week" hint="Birds reported on the most checklists right now." picks={picks.likely} names={names} />
      <PickList title="Just arriving" hint="Rarer three weeks ago, getting common now." picks={picks.arriving} names={names} />
    </div>
  );
}
