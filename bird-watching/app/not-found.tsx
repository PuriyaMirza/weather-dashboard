import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <h1 className="type-headline-md text-primary">Not in the guide</h1>
      <p className="type-body-md text-on-surface-variant">That page doesn&rsquo;t exist — maybe it flew off.</p>
      <Link href="/guide" className="type-label-lg text-secondary-fixed underline underline-offset-2">
        Back to the field guide
      </Link>
    </div>
  );
}
