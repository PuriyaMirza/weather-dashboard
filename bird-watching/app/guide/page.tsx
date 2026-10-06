import type { Metadata } from 'next';
import Link from 'next/link';
import { FieldGuide } from '@/components/guide/field-guide';
import { getAllSpecies, getFamilies, getSpeciesSource } from '@/lib/birds/species';
import { getSpeciesPhotos } from '@/lib/media/wikipedia';

export const metadata: Metadata = { title: 'Field guide' };

export default async function GuidePage() {
  const species = getAllSpecies();
  const photos = await getSpeciesPhotos(species);
  const thumbs = Object.fromEntries(Object.entries(photos).map(([code, photo]) => [code, photo.src]));
  const source = getSpeciesSource();
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="type-display-lg text-primary">Field guide</h1>
        <p className="type-body-md text-on-surface-variant">
          {source === 'seed'
            ? `${species.length} birds you're most likely to meet in Central Park, each with ID tips, look-alikes, and where to look.`
            : `Every species reported in Central Park on eBird. Birds marked with ID tips are the best ones to learn first.`}{' '}
          New to the terms? See the <Link href="/guide/glossary" className="text-secondary-fixed underline underline-offset-2">glossary</Link>.
        </p>
      </header>
      <FieldGuide
        species={species}
        families={getFamilies()}
        hasUndescribedSpecies={species.some((s) => !s.startHere)}
        thumbs={thumbs}
      />
    </div>
  );
}
