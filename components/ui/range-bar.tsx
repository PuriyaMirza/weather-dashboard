import { BAR_TONE_CLASS, type BarTone } from './progress-bar';

interface RangeBarProps {
  /** The scale the bar spans — e.g. the week's coldest low to warmest high. */
  min: number;
  max: number;
  low: number;
  high: number;
  tone?: BarTone;
  className?: string;
}

/**
 * A low→high span on a shared scale (the 7-day rows). Decorative: the low and high are always
 * printed on either side of it.
 */
export function RangeBar({ min, max, low, high, tone = 'secondary', className = '' }: RangeBarProps) {
  const span = max - min || 1;
  const left = Math.min(100, Math.max(0, ((low - min) / span) * 100));
  const right = Math.min(100, Math.max(0, ((max - high) / span) * 100));
  return (
    <div
      aria-hidden="true"
      className={`relative h-2 w-full overflow-hidden rounded-full bg-surface-container-highest ${className}`.trim()}
    >
      <div
        className={`absolute inset-y-0 rounded-full ${BAR_TONE_CLASS[tone]}`}
        style={{ left: `${left}%`, right: `${right}%` }}
      />
    </div>
  );
}
