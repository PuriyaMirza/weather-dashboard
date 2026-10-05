import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SpeciesDetail } from '@/components/guide/species-detail';
import { getAllSpecies, getSpecies } from '@/lib/birds/species';

interface SpeciesPageProps {
  params: Promise<{ code: string }>;
}

// Every species page is prerendered, so the whole guide can be cached for offline use. An
// unknown code is a 404 rather than an on-demand render.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSpecies().map((species) => ({ code: species.code }));
}

export async function generateMetadata({ params }: SpeciesPageProps): Promise<Metadata> {
  const species = getSpecies((await params).code);
  return species ? { title: species.commonName, description: species.summary ?? undefined } : {};
}

export default async function SpeciesPage({ params }: SpeciesPageProps) {
  const species = getSpecies((await params).code);
  if (!species) notFound();
  const linkableCodes = new Set(getAllSpecies().map((s) => s.code));
  return <SpeciesDetail species={species} linkableCodes={linkableCodes} />;
}
