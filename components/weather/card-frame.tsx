import type { ReactNode } from 'react';

/** 'ledger' is a visual skin only, never a behavioural branch: loading/error/unavailable/ready
 *  states, props, and data are identical either way. Every card in the registry now opts into it;
 *  'default' remains as the shell's other supported look rather than being deleted outright. */
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
 * inside the module's grid cell instead, for the cards restyled to the Postal Ledger direction —
 * the grid's own hairlines are untouched, so drag/resize/remove sizing is unaffected.
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
      <article className="relative flex h-full flex-col border-2 border-ledger-ink bg-cream p-5" aria-labelledby={titleId}>
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

export function CardState({
  label,
  tone = 'neutral',
  variant = 'default',
}: {
  label: string;
  tone?: 'neutral' | 'error';
  variant?: CardFrameVariant;
}) {
  // The ledger card's paper stays cream regardless of theme, so its placeholder needs the same
  // fixed, non-theme-varying colours as the rest of the ledger content (see --ledger-ink above) —
  // the default variant's tokens flip for dark mode and go illegible on that fixed paper.
  const classes =
    variant === 'ledger'
      ? tone === 'error'
        ? 'border-ledger-danger text-ledger-danger'
        : 'border-hairline text-ink-muted'
      : tone === 'error'
        ? 'border-danger-line text-danger'
        : 'border-line text-muted';

  return (
    <div
      className={`flex flex-1 items-center justify-center border border-dashed p-4 text-center text-xs ${classes}`}
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

  if (isLoading) content = <CardState label={loadingLabel} variant={variant} />;
  else if (errorMessage) content = <CardState label={errorMessage} tone="error" variant={variant} />;
  else if (isUnavailable) content = <CardState label={unavailableLabel} variant={variant} />;

  return (
    <CardFrame title={title} description={description} variant={variant}>
      {content}
    </CardFrame>
  );
}

/** Label/value pair used by the ledger panels' metric grids. */
export function LedgerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="ledger-label">{label}</dt>
      <dd className="font-display mt-1 text-lg leading-none text-ledger-ink">{value}</dd>
    </div>
  );
}
