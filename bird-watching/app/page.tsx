import Link from 'next/link';
import { SpeciesRow } from '@/components/guide/species-row';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { Surface } from '@/components/ui/surface';
import { getAllSpecies, getYearRoundRegulars } from '@/lib/birds/species';

const FIRST_WALK_TIPS = [
  'Go early. Birds are most active in the first few hours after sunrise.',
  'Walk slowly and stop often. Listen first — most birds are heard before they are seen.',
  'Look for movement, then note size, shape, and one or two colors before reaching for the guide.',
  'In spring and fall, start in the Ramble or the North Woods; in winter, check the Reservoir for ducks.',
];

export default function TodayPage() {
  const regulars = getYearRoundRegulars();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="type-display-lg text-primary">Birding Central Park</h1>
        <p className="type-body-md text-on-surface-variant">
          More than 200 species have been recorded here, and it&rsquo;s one of the best places in North America to
          watch spring and fall migration. Start with the birds below, then use the guide to put a name to
          everything else.
        </p>
      </header>

      <section aria-labelledby="regulars" className="flex flex-col gap-2">
        <SectionHeader id="regulars" title="Year-round regulars" meta={`${regulars.length} birds`} />
        <p className="type-body-sm text-on-surface-variant">Easy to find in any season — a good first checklist.</p>
        <Surface tone="container" className="py-1">
          <ul className="flex flex-col">
            {regulars.map((species) => (
              <li key={species.code}>
                <SpeciesRow species={species} />
              </li>
            ))}
          </ul>
        </Surface>
      </section>

      <Link
        href="/guide"
        className="flex min-h-14 items-center gap-3 rounded-xl bg-secondary-fixed px-4 type-label-lg text-on-secondary"
      >
        <Icon name="search" size={20} />
        Browse all {getAllSpecies().length} birds in the guide
        <Icon name="chevron-right" size={20} className="ml-auto" />
      </Link>

      <section aria-labelledby="first-walk" className="flex flex-col gap-2">
        <SectionHeader id="first-walk" title="Your first walk" />
        <Surface tone="container" className="p-4">
          <ol className="flex list-decimal flex-col gap-2 pl-5 type-body-md text-on-surface marker:text-secondary">
            {FIRST_WALK_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ol>
        </Surface>
      </section>
    </div>
  );
}
