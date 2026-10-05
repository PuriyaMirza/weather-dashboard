import Link from 'next/link';

/** The slim top bar: app name only. Navigation lives in the bottom bar, within thumb reach. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant/60 bg-surface/95 shadow-header backdrop-blur-sm">
      <div className="mx-auto flex h-[var(--header-height)] max-w-2xl items-center px-4">
        <Link href="/" className="type-headline-sm font-display text-primary">
          Central Park Birding
        </Link>
      </div>
    </header>
  );
}
