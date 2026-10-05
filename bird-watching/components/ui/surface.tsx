import type { ElementType, ReactNode } from 'react';

export type SurfaceTone = 'lowest' | 'low' | 'container' | 'high' | 'highest' | 'secondary';

// Full class strings (not interpolated) so Tailwind's scanner can see every one of them.
const TONE_CLASS: Record<SurfaceTone, string> = {
  lowest: 'bg-surface-container-lowest',
  low: 'bg-surface-container-low',
  container: 'bg-surface-container',
  high: 'bg-surface-container-high',
  highest: 'bg-surface-container-highest',
  secondary: 'bg-secondary-container',
};

const ELEVATION_CLASS = {
  none: '',
  card: 'shadow-card',
  raised: 'shadow-raised',
} as const;

const RADIUS_CLASS = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
} as const;

interface SurfaceProps {
  as?: ElementType;
  tone?: SurfaceTone;
  elevation?: keyof typeof ELEVATION_CLASS;
  radius?: keyof typeof RADIUS_CLASS;
  className?: string;
  children?: ReactNode;
  [prop: string]: unknown;
}

/**
 * A rounded, tonal container — the one shape every Forest card, panel and dialog is built from.
 * Tone picks how far the surface sits from the page; elevation adds the soft shadow.
 */
export function Surface({
  as: Component = 'div',
  tone = 'high',
  elevation = 'card',
  radius = 'xl',
  className = '',
  children,
  ...rest
}: SurfaceProps) {
  return (
    <Component
      className={`${TONE_CLASS[tone]} ${ELEVATION_CLASS[elevation]} ${RADIUS_CLASS[radius]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
}
