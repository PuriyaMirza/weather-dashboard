import Image from 'next/image';
import type { SpeciesPhoto as Photo } from '@/lib/media/wikipedia';

interface SpeciesPhotoProps {
  photo: Photo;
  commonName: string;
  /** Load eagerly — set for the species page's hero, which is above the fold. */
  priority?: boolean;
}

/** A Wikipedia lead photo with the credit its licence requires, always shown together. */
export function SpeciesPhoto({ photo, commonName, priority = false }: SpeciesPhotoProps) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-container">
        <Image
          src={photo.src}
          alt={`Photo of ${commonName}`}
          fill
          priority={priority}
          sizes="(min-width: 672px) 640px, 100vw"
          className="object-cover"
        />
      </div>
      <figcaption className="type-body-sm text-on-surface-variant">
        Photo: {photo.artist} ·{' '}
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
  );
}

/** A small square thumbnail for list rows. Decorative: the row's text already names the bird. */
export function SpeciesThumb({ src }: { src: string | undefined }) {
  return (
    <span aria-hidden="true" className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container-highest">
      {src && <Image src={src} alt="" fill sizes="48px" className="object-cover" />}
    </span>
  );
}
