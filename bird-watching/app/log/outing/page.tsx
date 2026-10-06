import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OutingEditor } from '@/components/log/outing-editor';
import { getSpeciesOptions } from '@/lib/birds/species';

export const metadata: Metadata = { title: 'Outing' };

// The outing id is a query parameter, not a route segment: outings exist only in this browser's
// IndexedDB, so the page must be one static shell (also what lets it work offline later).
export default function OutingPage() {
  return (
    <Suspense fallback={<p className="type-body-md text-on-surface-variant">Opening outing…</p>}>
      <OutingEditor species={getSpeciesOptions()} />
    </Suspense>
  );
}
