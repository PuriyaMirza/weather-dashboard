interface RingGaugeProps {
  /** 0–1; clamped. */
  value: number;
  /** Printed in the centre — the ring itself is decorative, this text is the reading. */
  label: string;
  size?: number;
}

/** A circular progress ring with its value printed inside (the current-conditions rain ring). */
export function RingGauge({ value, label, size = 48 }: RingGaugeProps) {
  const stroke = 3.5;
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-container-highest)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--secondary-fixed)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="absolute type-label-md font-bold text-primary">{label}</span>
    </div>
  );
}
