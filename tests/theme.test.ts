import { describe, expect, it } from 'vitest';
import { applyThemePreference, isThemePreference, resolveTheme, themeInitScript, THEME_ATTRIBUTE } from '@/lib/theme';
import { DASHBOARD_STORAGE_KEY } from '@/store/dashboard-store';

describe('resolveTheme', () => {
  it('honours an explicit choice regardless of the system setting', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('applyThemePreference', () => {
  it('stamps an explicit preference onto the element', () => {
    const root = document.createElement('html');
    applyThemePreference('dark', root);
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
  });

  it('removes the attribute for "system" so CSS keeps following the OS live', () => {
    const root = document.createElement('html');
    root.setAttribute(THEME_ATTRIBUTE, 'dark');

    applyThemePreference('system', root);

    // Pinning a resolved value here would freeze the page if the user changed their OS setting
    // while the tab was open.
    expect(root.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });
});

describe('isThemePreference', () => {
  it('accepts the three valid values and rejects anything else', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(true);

    for (const bad of ['Dark', '', null, undefined, 0, {}, ['dark']]) {
      expect(isThemePreference(bad)).toBe(false);
    }
  });
});

describe('themeInitScript', () => {
  /** Runs the generated script the way the browser would, against a given storage state. */
  function run(stored: string | null): string | null {
    const root = document.createElement('html');
    const storage: Record<string, string> = {};
    if (stored !== null) storage[DASHBOARD_STORAGE_KEY] = stored;

    const script = themeInitScript(DASHBOARD_STORAGE_KEY);
    new Function(
      'document',
      'localStorage',
      script,
    )({ documentElement: root }, { getItem: (key: string) => storage[key] ?? null });

    return root.getAttribute('data-theme');
  }

  it('applies a stored explicit theme before paint', () => {
    expect(run(JSON.stringify({ state: { theme: 'dark' }, version: 4 }))).toBe('dark');
    expect(run(JSON.stringify({ state: { theme: 'light' }, version: 4 }))).toBe('light');
  });

  it('leaves the attribute unset for "system", letting the media query decide', () => {
    expect(run(JSON.stringify({ state: { theme: 'system' }, version: 4 }))).toBeNull();
  });

  it('does nothing when there is no stored preference', () => {
    expect(run(null)).toBeNull();
  });

  it('never throws on corrupt storage — a throw here would block the whole page', () => {
    expect(() => run('not json at all')).not.toThrow();
    expect(run('not json at all')).toBeNull();

    expect(() => run(JSON.stringify({ nope: true }))).not.toThrow();
    expect(run(JSON.stringify({ nope: true }))).toBeNull();
  });

  it('ignores a stored value that is not a real preference', () => {
    expect(run(JSON.stringify({ state: { theme: 'neon' }, version: 4 }))).toBeNull();
  });
});
