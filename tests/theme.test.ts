import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  DEFAULT_THEME,
  isThemeId,
  THEME_ATTRIBUTE,
  THEME_IDS,
  THEMES,
  themeInitScript,
  toThemeId,
} from '@/lib/theme';
import { DASHBOARD_STORAGE_KEY } from '@/store/dashboard-store';

describe('theme registry', () => {
  it('defines every listed theme, and the default is one of them', () => {
    for (const id of THEME_IDS) expect(THEMES[id].id).toBe(id);
    expect(THEME_IDS).toContain(DEFAULT_THEME);
  });
});

describe('applyTheme', () => {
  it('stamps the theme onto the element', () => {
    const root = document.createElement('html');
    applyTheme('forest', root);
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('forest');
  });
});

describe('isThemeId / toThemeId', () => {
  it('accepts only registered themes', () => {
    expect(isThemeId('forest')).toBe(true);
    for (const bad of ['Forest', '', null, undefined, 0, {}, ['forest'], 'light', 'dark', 'system']) {
      expect(isThemeId(bad)).toBe(false);
    }
  });

  it('maps the retired light/dark/system values, and anything unknown, onto the default', () => {
    for (const legacy of ['light', 'dark', 'system', 'neon', undefined, 42]) {
      expect(toThemeId(legacy)).toBe(DEFAULT_THEME);
    }
    expect(toThemeId('forest')).toBe('forest');
  });
});

describe('themeInitScript', () => {
  /** Runs the generated script the way the browser would, against a given storage state. */
  function run(stored: string | null): string | null {
    const root = document.createElement('html');
    root.setAttribute(THEME_ATTRIBUTE, DEFAULT_THEME);
    const storage: Record<string, string> = {};
    if (stored !== null) storage[DASHBOARD_STORAGE_KEY] = stored;

    const script = themeInitScript(DASHBOARD_STORAGE_KEY);
    new Function(
      'document',
      'localStorage',
      script,
    )({ documentElement: root }, { getItem: (key: string) => storage[key] ?? null });

    return root.getAttribute(THEME_ATTRIBUTE);
  }

  it('applies a stored theme before paint', () => {
    expect(run(JSON.stringify({ state: { theme: 'forest' }, version: 9 }))).toBe('forest');
  });

  it('leaves the server-rendered default when nothing usable is stored', () => {
    expect(run(null)).toBe(DEFAULT_THEME);
    // Retired and unknown values are not stamped onto the page.
    expect(run(JSON.stringify({ state: { theme: 'dark' }, version: 8 }))).toBe(DEFAULT_THEME);
    expect(run(JSON.stringify({ state: { theme: 'neon' }, version: 9 }))).toBe(DEFAULT_THEME);
  });

  it('never throws on corrupt storage — a throw here would block the whole page', () => {
    expect(() => run('not json at all')).not.toThrow();
    expect(run('not json at all')).toBe(DEFAULT_THEME);

    expect(() => run(JSON.stringify({ nope: true }))).not.toThrow();
    expect(run(JSON.stringify({ nope: true }))).toBe(DEFAULT_THEME);
  });
});
