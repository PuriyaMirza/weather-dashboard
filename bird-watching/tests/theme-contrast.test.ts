import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Reads the real stylesheet, so an edited token is checked without copying values here. */
const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
const block = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const tokens: Record<string, string> = {};
for (const [, name, value] of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[name] = value;

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

const TEXT = ['primary', 'secondary', 'secondary-fixed', 'on-surface', 'on-surface-variant', 'on-secondary-container', 'error'];
const SURFACES = ['surface', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'secondary-container'];

describe('theme contrast (WCAG AA, 4.5:1)', () => {
  it.each(TEXT.flatMap((t) => SURFACES.map((s) => [t, s])))('%s on %s', (text, surface) => {
    expect(contrast(tokens[text], tokens[surface])).toBeGreaterThanOrEqual(4.5);
  });

  it('dark text on the filled chips and buttons', () => {
    expect(contrast(tokens['on-secondary'], tokens['secondary-fixed'])).toBeGreaterThanOrEqual(4.5);
  });
});
