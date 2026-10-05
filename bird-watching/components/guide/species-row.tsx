import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { SIZE_LABEL, sizeClassOf } from '@/lib/birds/labels';
import type { Species } from '@/lib/birds/schema';

interface SpeciesRowProps {
  species: Species;
  /** Show the family name; redundant when the list is already grouped under family headings. */
  showFamily?: boolean;
  /** Tag birds that have a guide write-up — only useful when some don't. */
  markWriteUp?: boolean;
}

/** One tappable line in the guide: common name, scientific name, and size in everyday terms. */
export function SpeciesRow({ species, showFamily = false, markWriteUp = false }: SpeciesRowProps) {
  const size = sizeClassOf(species.lengthIn);
  const details = [showFamily ? species.family : null, size ? SIZE_LABEL[size] : null].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/guide/${species.code}`}
      className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-container-high"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="type-label-lg text-primary">{species.commonName}</span>
          <span className="type-body-sm italic text-on-surface-variant">{species.scientificName}</span>
        </span>
        {details && <span className="block type-body-sm text-on-surface-variant">{details}</span>}
        {markWriteUp && species.startHere && (
          <span className="mt-1 inline-block rounded-full bg-secondary-container px-2 py-0.5 type-label-sm text-secondary-fixed">
            ID tips
          </span>
        )}
      </span>
      {species.bandingCode && (
        <span className="type-label-sm text-on-secondary-container">
          <span className="sr-only">Banding code </span>
          {species.bandingCode}
        </span>
      )}
      <Icon name="chevron-right" size={20} className="shrink-0 text-on-surface-variant" />
    </Link>
  );
}
