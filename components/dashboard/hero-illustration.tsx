import { useId } from 'react';
import { HERO_ART, HERO_TEXT_TOP, type AtmospherePalette } from '@/lib/weather/atmosphere';

interface HeroIllustrationProps {
  palette: AtmospherePalette;
}

/**
 * The spruce tree line behind the hero text. Only the sky changes with the weather; the fog banks,
 * glow and trees are fixed Forest art, so their fills are literals rather than theme tokens.
 *
 * `preserveAspectRatio="none"` lets the art stretch to any card width without cropping the tree
 * line — the shapes are soft enough that horizontal stretch reads as a wider valley, not distortion.
 */
export function HeroIllustration({ palette }: HeroIllustrationProps) {
  // useId, not a fixed id: two heroes (or a future preview) on one page would otherwise share a
  // gradient and the second would silently paint the first one's sky.
  const skyId = `hero-sky-${useId().replace(/:/g, '')}`;
  const [backBand, frontBand] = HERO_ART.fogBands;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 400 240"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.from} />
          <stop offset={HERO_TEXT_TOP} stopColor={palette.via} />
          <stop offset="1" stopColor={palette.to} />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${skyId})`} />
      <path
        d="M-20 148C50 140 110 162 190 152C280 142 340 168 420 146V240H-20V148Z"
        fill={backBand.color}
        fillOpacity={backBand.opacity}
      />
      <path
        d="M-10 164C70 158 140 178 220 168C290 158 350 174 420 160V240H-10V164Z"
        fill={frontBand.color}
        fillOpacity={frontBand.opacity}
      />
      <polygon fill="#0c251e" points="58,160 52,240 64,240" />
      <polygon fill="#0c251e" points="58,142 50,188 66,188" />
      <polygon fill="#0a1f1a" points="124,124 116,240 132,240" />
      <polygon fill="#0a1f1a" points="124,105 114,165 134,165" />
      <polygon fill="#15362c" points="186,152 181,240 191,240" />
      <polygon fill="#071914" points="288,112 280,240 296,240" />
      <polygon fill="#071914" points="288,96 278,168 298,168" />
      <polygon fill="#0b221b" points="324,142 318,240 330,240" />
      <polygon fill="#081c16" points="358,128 350,240 366,240" />
      <ellipse cx="200" cy="162" rx="220" ry="18" fill={HERO_ART.fogGlow.color} fillOpacity={HERO_ART.fogGlow.opacity} />
    </svg>
  );
}
