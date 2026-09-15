/**
 * Perforation-style divider for the Postal Ledger card treatment — a row of dots between two
 * hairlines, echoing a ticket's tear line. Purely decorative, so it sits outside the accessibility
 * tree entirely rather than announcing itself as a separator no one asked to hear.
 */
export function LedgerDivider() {
  return (
    <div aria-hidden="true" className="my-4 flex items-center gap-1.5">
      <span className="h-px min-w-4 flex-1 bg-hairline" />
      {Array.from({ length: 10 }, (_, index) => (
        <span key={index} className="h-1.5 w-1.5 shrink-0 rounded-full border border-hairline bg-cream" />
      ))}
      <span className="h-px min-w-4 flex-1 bg-hairline" />
    </div>
  );
}
