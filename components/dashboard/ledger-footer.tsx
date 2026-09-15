/** Fixed decorative pattern, mirroring a QR mark without encoding anything. */
const QR_PATTERN = [
  1, 0, 1, 0, 1,
  0, 0, 1, 1, 0,
  1, 1, 0, 1, 0,
  0, 1, 1, 0, 1,
  1, 0, 1, 0, 1,
];

/**
 * Purely decorative flourish at the foot of the dashboard — a stand-in serial number and a
 * QR-style mark, echoing the Postal Ledger reference. Neither encodes real information, so both
 * are hidden from assistive tech rather than announced as if they meant something.
 */
export function LedgerFooter() {
  return (
    <div aria-hidden="true" className="mt-6 flex items-center justify-between border-t border-dashed border-hairline pt-3.5">
      <span className="text-[9.5px] tracking-[0.1em] text-ink-muted">Ser. 001-WX</span>
      <div className="grid h-[26px] w-[26px] grid-cols-5 grid-rows-5 gap-[1.5px]">
        {QR_PATTERN.map((on, index) => (
          <div key={index} className={on ? 'bg-ink' : 'bg-transparent'} />
        ))}
      </div>
    </div>
  );
}
