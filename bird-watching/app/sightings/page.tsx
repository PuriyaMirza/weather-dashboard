import type { Metadata } from 'next';
import { SightingsList } from '@/components/live/sightings-list';
import { getAllSpecies } from '@/lib/birds/species';

export const metadata: Metadata = { title: 'Recent sightings' };

export default function SightingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="type-display-lg text-primary">Recent sightings</h1>
        <p className="type-body-md text-on-surface-variant">
          What birders have reported in Central Park, rare birds first. Tap a name for its guide page.
        </p>
      </header>
      <SightingsList guideCodes={getAllSpecies().map((s) => s.code)} />
    </div>
  );
}
