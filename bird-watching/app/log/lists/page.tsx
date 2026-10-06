import type { Metadata } from 'next';
import Link from 'next/link';
import { SpeciesLists } from '@/components/log/species-lists';
import { Icon } from '@/components/ui/icon';
import { getAllSpecies } from '@/lib/birds/species';

export const metadata: Metadata = { title: 'Your lists' };

export default function ListsPage() {
  return (
    <div className="flex flex-col gap-5">
      <Link href="/log" className="inline-flex min-h-11 items-center gap-1 self-start pr-3 type-label-lg text-secondary-fixed">
        <Icon name="arrow-back" size={20} />
        Your log
      </Link>
      <h1 className="type-display-lg text-primary">Your lists</h1>
      <SpeciesLists guideCodes={getAllSpecies().map((s) => s.code)} />
    </div>
  );
}
