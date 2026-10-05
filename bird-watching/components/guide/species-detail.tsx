import Link from 'next/link';
import type { ReactNode } from 'react';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import { COLOR_LABEL, HABITAT_LABEL, SIZE_LABEL, formatLength, sizeClassOf } from '@/lib/birds/labels';
import type { Species } from '@/lib/birds/schema';
import type { SpeciesPhoto as Photo } from '@/lib/media/wikipedia';
import { SpeciesPhoto } from './species-photo';

interface SpeciesDetailProps {
  species: Species;
  /** Codes that have their own page, so look-alikes link only where there's somewhere to go. */
  linkableCodes: ReadonlySet<string>;
  /** Null when there's no properly licensed photo (or the build was offline). */
  photo: Photo | null;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Surface as="section" tone="container" className="flex flex-col gap-2 p-4">
      <h2 className="type-label-md uppercase text-secondary-fixed">{title}</h2>
      {children}
    </Surface>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center gap-2 type-label-lg text-secondary-fixed underline-offset-2 hover:underline"
    >
      <Icon name="link" size={18} />
      {children}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** A species page: everything the guide knows, and nothing it doesn't. */
export function SpeciesDetail({ species, linkableCodes, photo }: SpeciesDetailProps) {
  const size = sizeClassOf(species.lengthIn);
  return (
    <article className="flex flex-col gap-4">
      <Link
        href="/guide"
        className="inline-flex min-h-11 items-center gap-1 self-start rounded-full pr-3 type-label-lg text-secondary-fixed"
      >
        <Icon name="arrow-back" size={20} />
        Field guide
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="type-display-lg text-primary">{species.commonName}</h1>
        <p className="type-body-md italic text-on-surface-variant">{species.scientificName}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip>{species.family}</Chip>
          {species.bandingCode && (
            <Chip>
              <span className="sr-only">Banding code </span>
              {species.bandingCode}
            </Chip>
          )}
        </div>
      </header>

      {photo && <SpeciesPhoto photo={photo} commonName={species.commonName} priority />}

      {species.summary && <p className="type-body-md text-on-surface">{species.summary}</p>}

      {species.lengthIn && size && (
        <Section title="Size">
          <p className="type-body-md text-on-surface">
            {SIZE_LABEL[size]} <span className="text-on-surface-variant">· {formatLength(species.lengthIn)} long</span>
          </p>
        </Section>
      )}

      {species.idTips.length > 0 && (
        <Section title="How to identify">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 type-body-md text-on-surface marker:text-secondary">
            {species.idTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          {species.colors.length > 0 && (
            <p className="type-body-sm text-on-surface-variant">
              Colors: {species.colors.map((c) => COLOR_LABEL[c].toLowerCase()).join(', ')}
            </p>
          )}
        </Section>
      )}

      {species.lookAlikes.length > 0 && (
        <Section title="Look-alikes">
          <ul className="flex flex-col gap-3">
            {species.lookAlikes.map((lookAlike) => (
              <li key={lookAlike.name} className="flex flex-col gap-0.5">
                {lookAlike.code && linkableCodes.has(lookAlike.code) ? (
                  <Link
                    href={`/guide/${lookAlike.code}`}
                    className="type-label-lg text-secondary-fixed underline underline-offset-2"
                  >
                    {lookAlike.name}
                  </Link>
                ) : (
                  <span className="type-label-lg text-primary">{lookAlike.name}</span>
                )}
                <span className="type-body-md text-on-surface">{lookAlike.howToTell}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(species.whereInPark || species.habitats.length > 0) && (
        <Section title="Where in the park">
          {species.whereInPark && <p className="type-body-md text-on-surface">{species.whereInPark}</p>}
          {species.habitats.length > 0 && (
            <p className="type-body-sm text-on-surface-variant">
              Habitat: {species.habitats.map((h) => HABITAT_LABEL[h].toLowerCase()).join(', ')}
            </p>
          )}
        </Section>
      )}

      {species.whenInPark && (
        <Section title="When to look">
          <p className="type-body-md text-on-surface">{species.whenInPark}</p>
        </Section>
      )}

      {species.behavior && (
        <Section title="Behavior">
          <p className="type-body-md text-on-surface">{species.behavior}</p>
        </Section>
      )}

      {species.voice && (
        <Section title="Voice">
          <p className="type-body-md text-on-surface">{species.voice}</p>
        </Section>
      )}

      {!species.startHere && (
        <p className="type-body-md text-on-surface-variant">
          No field-guide write-up for this species yet. The links below have photos, sounds, and range maps.
        </p>
      )}

      <Section title="Photos, sounds, and more">
        <ExternalLink href={`https://ebird.org/species/${species.code}`}>eBird species page</ExternalLink>
        <ExternalLink href={`https://search.macaulaylibrary.org/catalog?taxonCode=${species.code}&mediaType=photo`}>
          Photos at Macaulay Library
        </ExternalLink>
        <ExternalLink href={`https://search.macaulaylibrary.org/catalog?taxonCode=${species.code}&mediaType=audio`}>
          Recordings at Macaulay Library
        </ExternalLink>
      </Section>
    </article>
  );
}
