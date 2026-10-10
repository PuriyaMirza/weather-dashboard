'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PhotoCredit } from '@/components/guide/species-photo';
import { Icon } from '@/components/ui/icon';
import type { CandidatePhoto } from '@/lib/identify/schema';

/** The fields the enlarged view needs; a guide `SpeciesPhoto` satisfies it too. */
export type LightboxPhoto = Pick<CandidatePhoto, 'src' | 'width' | 'height' | 'artist' | 'license' | 'licenseUrl' | 'sourceUrl'>;

interface PhotoLightboxProps {
  photo: LightboxPhoto;
  commonName: string;
  onClose: () => void;
}

/**
 * A suggestion's reference photo at full width, with its credit. A native modal <dialog> gives
 * focus trapping, Escape and focus return for free, so there is no hand-rolled focus code here.
 * It reuses the same Commons rendition as the thumbnail — no extra Wikipedia request.
 */
export function PhotoLightbox({ photo, commonName, onClose }: PhotoLightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={`Photo of ${commonName}`}
      onClose={onClose}
      // A tap on the backdrop lands on the <dialog> itself; taps on its contents don't.
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-xl overflow-hidden rounded-xl bg-surface p-0 text-on-surface shadow-raised backdrop:bg-[rgb(var(--shadow-color)/0.7)]"
    >
      <figure className="flex flex-col">
        <Image
          src={photo.src}
          alt={`Photo of ${commonName}`}
          width={photo.width}
          height={photo.height}
          sizes="(min-width: 608px) 576px, calc(100vw - 2rem)"
          className="h-auto max-h-[70vh] w-full bg-surface-container object-contain"
        />
        <figcaption className="flex items-start gap-2 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block type-label-lg text-primary">{commonName}</span>
            <span className="block type-body-sm text-on-surface-variant">
              <PhotoCredit photo={photo} />
            </span>
          </span>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high"
            aria-label="Close photo"
          >
            <Icon name="close" size={24} />
          </button>
        </figcaption>
      </figure>
    </dialog>
  );
}

/**
 * A square thumbnail that opens the photo large. A sibling of the row's label or link, never
 * inside it, so the row keeps one accessible name and one tap target each.
 */
export function PhotoThumbButton({ photo, commonName, className }: { photo: LightboxPhoto; commonName: string; className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge photo of ${commonName}`}
        className={`relative shrink-0 overflow-hidden rounded-lg bg-surface-container-highest ${className}`}
      >
        <Image src={photo.src} alt="" fill sizes="80px" className="object-cover" />
      </button>
      {open && <PhotoLightbox photo={photo} commonName={commonName} onClose={() => setOpen(false)} />}
    </>
  );
}
