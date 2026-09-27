export type BarTone = 'secondary-fixed' | 'secondary' | 'primary-fixed' | 'secondary-container';

export const BAR_TONE_CLASS: Record<BarTone, string> = {
  'secondary-fixed': 'bg-secondary-fixed',
  secondary: 'bg-secondary',
  'primary-fixed': 'bg-primary-fixed',
  'secondary-container': 'bg-secondary-container',
};

interface ProgressBarProps {
  /** 0–1; clamped. */
  value: number;
  tone?: BarTone;
  className?: string;
}

/**
 * A thin fill bar. Decorative (aria-hidden): it only ever restates a number printed beside it,
 * which is what keeps it from being information conveyed by colour or length alone.
 */
export function ProgressBar({ value, tone = 'secondary-fixed', className = '' }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      aria-hidden="true"
      className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest ${className}`.trim()}
    >
      <div className={`h-full rounded-full ${BAR_TONE_CLASS[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
