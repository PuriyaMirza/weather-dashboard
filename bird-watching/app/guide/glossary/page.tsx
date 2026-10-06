import type { Metadata } from 'next';
import { Surface } from '@/components/ui/surface';
import { GLOSSARY } from '@/lib/birds/glossary';

export const metadata: Metadata = { title: 'Glossary' };

export default function GlossaryPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="type-display-lg text-primary">Glossary</h1>
        <p className="type-body-md text-on-surface-variant">
          The words the guide uses for parts of a bird, and the birding slang you&rsquo;ll hear on park walks.
        </p>
      </header>
      {GLOSSARY.map((section) => (
        <Surface as="section" tone="container" key={section.title} className="flex flex-col gap-3 p-4">
          <h2 className="type-headline-sm text-primary">{section.title}</h2>
          <dl className="flex flex-col gap-3">
            {section.terms.map((entry) => (
              <div key={entry.term} className="flex flex-col gap-0.5">
                <dt className="type-label-lg text-secondary-fixed">
                  {entry.term}
                  {entry.aka && <span className="font-normal text-on-surface-variant"> ({entry.aka})</span>}
                </dt>
                <dd className="type-body-md text-on-surface">{entry.definition}</dd>
              </div>
            ))}
          </dl>
        </Surface>
      ))}
    </div>
  );
}
