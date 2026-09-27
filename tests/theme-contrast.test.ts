import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '@/lib/theme';

/**
 * Every theme is a token block in globals.css, and a new palette's most likely regression is text
 * that is too faint on the surfaces it actually sits on. This reads the real stylesheet, so a token
 * edited there is checked here without anyone remembering to copy the value across.
 */
const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

function themeTokens(theme: string): Record<string, string> {
  const block = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!block) throw new Error(`no token block for theme "${theme}"`);
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[name] = value;
  return tokens;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = ['primary', 'primary-fixed', 'secondary', 'secondary-fixed', 'on-surface', 'on-surface-variant', 'on-secondary-container', 'error'];
const SURFACES = [
  'surface',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'secondary-container',
];

describe.each(THEME_IDS)('%s theme contrast (WCAG AA, 4.5:1)', (theme) => {
  const tokens = themeTokens(theme);

  it.each(TEXT.flatMap((text) => SURFACES.map((surface) => [text, surface])))('%s text on %s', (text, surface) => {
    expect(tokens[text], `--${text} missing`).toBeDefined();
    expect(tokens[surface], `--${surface} missing`).toBeDefined();
    expect(contrast(tokens[text], tokens[surface])).toBeGreaterThanOrEqual(4.5);
  });

  it('dark text on the selected/primary fills', () => {
    expect(contrast(tokens['on-secondary'], tokens['secondary-fixed'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens['on-secondary'], tokens['primary'])).toBeGreaterThanOrEqual(4.5);
  });

  it.each([1, 2, 3, 4, 5])('severity band %i text on its own background', (band) => {
    expect(contrast(tokens[`scale-${band}`], tokens[`scale-${band}-bg`])).toBeGreaterThanOrEqual(4.5);
  });
});
