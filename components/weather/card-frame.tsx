import type { ReactNode } from 'react';

/** 'ledger' is a visual skin only — see the four callers that opt into it — never a behavioural
 *  branch: loading/error/unavailable/ready states, props, and data are identical either way. */
export type CardFrameVariant = 'default' | 'ledger';

/**
 * The shell every module sits in.
 *
 * There is no border in the default variant: the grid draws hairlines by showing its own
 * background through a one-pixel gap, so each module only has to paint an opaque field. Corners
 * are square and there is no shadow — separation comes from the rule and the space, not from a
 * raised surface.
 *
 * The 'ledger' variant paints its own double border (a solid outer rule and an inset accent rule)
 * inside the module's grid cell instead, for the small set of cards restyled to the Postal Ledger
 * direction — the grid's own hairlines are untouched, so drag/resize/remove sizing is unaffected.
 */
export function CardFrame({
  title,
  description,
  variant = 'default',
  children,
}: {
  title: string;
  description: string;
  variant?: CardFrameVariant;
  children: ReactNode;
}) {
  const titleId = `${title.toLowerCase().replaceAll(' ', '-')}-title`;

  if (variant === 'ledger') {
    return (
      <article className="relative flex h-full flex-col border-2 border-ink bg-cream p-5" aria-labelledby={titleId}>
        {/* The inset accent rule, 5px in from the module's own edge — decorative, so it sits
            outside the tab order and out of the accessibility tree. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-[5px] border border-red" />
        <h2 id={titleId} className="ledger-label relative">
          {title}
        </h2>
        <span className="sr-only">{description}</span>
        <div className="relative mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col bg-card p-5" aria-labelledby={titleId}>
      <h2 id={titleId} className="eyebrow text-muted">
        {title}
      </h2>
      {/* The description is useful context but must not compete with the reading, so it is
          available to assistive tech and to the menu rather than printed on every module. */}
      <span className="sr-only">{description}</span>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </article>
  );
}

export function CardState({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'error' }) {
  return (
    <div
      className={`flex flex-1 items-center justify-center border border-dashed p-4 text-center text-xs ${
        tone === 'error' ? 'border-danger-line text-danger' : 'border-line text-muted'
      }`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {label}
    </div>
  );
}

interface CardBoundaryProps {
  title: string;
  description: string;
  isLoading?: boolean;
  errorMessage?: string;
  /** True when the request succeeded but this module's particular data isn't present. */
  isUnavailable?: boolean;
  loadingLabel: string;
  unavailableLabel: string;
  /** Opts into the Postal Ledger shell (see `CardFrame`) — a visual skin only. */
  variant?: CardFrameVariant;
  children: ReactNode;
}

/**
 * Renders the four states every module must implement — loading, error, unavailable-data, and
 * ready — so each module declares only its ready-state content. Previously each card repeated its
 * title and description across four early returns, which is how they drift apart.
 */
export function CardBoundary({
  title,
  description,
  isLoading,
  errorMessage,
  isUnavailable,
  loadingLabel,
  unavailableLabel,
  variant,
  children,
}: CardBoundaryProps) {
  let content: ReactNode = children;

  if (isLoading) content = <CardState label={loadingLabel} />;
  else if (errorMessage) content = <CardState label={errorMessage} tone="error" />;
  else if (isUnavailable) content = <CardState label={unavailableLabel} />;

  return (
    <CardFrame title={title} description={description} variant={variant}>
      {content}
    </CardFrame>
  );
}

/** Label/value pair used by the composite panels' metric grids. */
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-line pt-2">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl leading-none text-ink-strong tabular-nums">{value}</dd>
    </div>
  );
}
