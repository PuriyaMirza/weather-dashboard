import type { ReactNode } from 'react';

export function CardFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const titleId = `${title.toLowerCase().replaceAll(' ', '-')}-title`;

  return (
    <article className="flex h-full flex-col rounded-3xl border border-line bg-card p-5 shadow-sm" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId} className="text-lg font-semibold text-ink-strong">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </article>
  );
}

export function CardState({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'error' }) {
  return (
    <div className={`flex min-h-40 flex-1 items-center justify-center rounded-2xl border border-dashed p-6 text-center text-sm ${tone === 'error' ? 'border-danger-line bg-danger-soft text-danger' : 'border-line-strong bg-canvas text-muted'}`} role={tone === 'error' ? 'alert' : 'status'}>
      {label}
    </div>
  );
}

interface CardBoundaryProps {
  title: string;
  description: string;
  isLoading?: boolean;
  errorMessage?: string;
  /** True when the request succeeded but this card's particular data isn't present. */
  isUnavailable?: boolean;
  loadingLabel: string;
  unavailableLabel: string;
  children: ReactNode;
}

/**
 * Renders the four states every card must implement — loading, error, unavailable-data, and ready
 * — so each card declares only its ready-state content. Previously each card repeated its title
 * and description across four early returns, which is how they drift apart.
 */
export function CardBoundary({
  title,
  description,
  isLoading,
  errorMessage,
  isUnavailable,
  loadingLabel,
  unavailableLabel,
  children,
}: CardBoundaryProps) {
  let content: ReactNode = children;

  if (isLoading) content = <CardState label={loadingLabel} />;
  else if (errorMessage) content = <CardState label={errorMessage} tone="error" />;
  else if (isUnavailable) content = <CardState label={unavailableLabel} />;

  return (
    <CardFrame title={title} description={description}>
      {content}
    </CardFrame>
  );
}

/** Label/value pair used by most cards' metric grids. */
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas p-3">
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
