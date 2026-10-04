import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

/**
 * The shell every module sits in: a rounded Forest surface that fills its grid cell.
 *
 * The grid cell around it is transparent and only rounds its corners, so the card paints its own
 * surface and shadow — the cell stays free for arrange-mode outlines without fighting the card's
 * background.
 *
 * `@container` lets a module adapt to the size the person picked (small, medium, large) without
 * being told it: the same component is 170px wide on a phone and 600px wide as a large tile.
 */
export function CardFrame({
  title,
  description,
  subtitle,
  icon,
  isEditing,
  onRemove,
  children,
}: {
  title: string;
  description: string;
  /**
   * Printed under the title and folded into the module's accessible name, for a module showing
   * something other than its default view — a day-following module on a later day says "Saturday"
   * here, so the tile can never be mistaken for today's.
   */
  subtitle?: string;
  /** Decorative glyph beside the title; the title carries the meaning. */
  icon?: IconName;
  /** While arranging, the icon above stands in for the old separate Remove button — its own slot,
   *  not a second control, so a module's identity and the way to remove it sit in the same place. */
  isEditing?: boolean;
  onRemove?: () => void;
  children: ReactNode;
}) {
  const slug = title.toLowerCase().replaceAll(' ', '-');
  const titleId = `${slug}-title`;
  const subtitleId = `${slug}-subtitle`;
  const showRemove = isEditing && onRemove;

  return (
    <article
      className="@container flex h-full min-w-0 flex-col rounded-xl bg-surface-container-high p-4 shadow-card"
      aria-labelledby={subtitle ? `${titleId} ${subtitleId}` : titleId}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="min-w-0 type-label-sm text-secondary uppercase">
          {title}
        </h2>
        {showRemove ? (
          // Padding grows the tap target to 44px; the matching negative margin cancels it back out
          // of the flex layout, so the header's height and the title's available width don't
          // change just because arrange mode is on.
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${title} from the dashboard`}
            className="-m-3 shrink-0 rounded-full p-3 text-error outline-none hover:bg-error-container focus-visible:ring-2 focus-visible:ring-error"
          >
            <Icon name="close" size={20} />
          </button>
        ) : (
          icon && <Icon name={icon} size={20} className="shrink-0 text-secondary-fixed" />
        )}
      </div>
      {subtitle && (
        <p
          id={subtitleId}
          className="mt-1.5 inline-flex items-center gap-1 self-start rounded-full bg-secondary-container px-2.5 py-0.5 type-label-md text-secondary-fixed"
        >
          <Icon name="calendar" size={14} className="shrink-0" />
          {subtitle}
        </p>
      )}
      {/* The description is useful context but must not compete with the reading, so it is
          available to assistive tech and to the menu rather than printed on every module. */}
      <span className="sr-only">{description}</span>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </article>
  );
}

export function CardState({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'error' }) {
  const classes = tone === 'error' ? 'border-error/50 text-error' : 'border-outline-variant text-on-surface-variant';

  return (
    <div
      className={`flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center type-body-sm ${classes}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {label}
    </div>
  );
}

interface CardBoundaryProps {
  title: string;
  description: string;
  /** See `CardFrame`. */
  subtitle?: string;
  icon?: IconName;
  isEditing?: boolean;
  onRemove?: () => void;
  isLoading?: boolean;
  errorMessage?: string;
  /** True when the request succeeded but this module's particular data isn't present. */
  isUnavailable?: boolean;
  loadingLabel: string;
  unavailableLabel: string;
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
  subtitle,
  icon,
  isEditing,
  onRemove,
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
    <CardFrame
      title={title}
      description={description}
      subtitle={subtitle}
      icon={icon}
      isEditing={isEditing}
      onRemove={onRemove}
    >
      {content}
    </CardFrame>
  );
}

/**
 * Label/value pair for a panel's metric grid, on a raised inner chip. Must sit inside a `<dl>`.
 */
export function Metric({ label, value, icon }: { label: string; value: ReactNode; icon?: IconName }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-container-highest/60 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 type-label-sm text-on-secondary-container uppercase">
        {icon && <Icon name={icon} size={16} className="shrink-0 text-secondary-fixed" />}
        {label}
      </dt>
      <dd className="mt-1 type-label-lg text-primary">{value}</dd>
    </div>
  );
}
