export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_ATTRIBUTE = 'data-theme';

/**
 * Resolves what the page should actually display. `system` deliberately resolves to no attribute
 * at all rather than a concrete value — the CSS media query handles it, so the page keeps
 * following the OS if the user changes it while the tab is open.
 */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

/** Applies a preference to the document. `system` clears the attribute so CSS decides. */
export function applyThemePreference(preference: ThemePreference, root: HTMLElement): void {
  if (preference === 'system') {
    root.removeAttribute(THEME_ATTRIBUTE);
    return;
  }
  root.setAttribute(THEME_ATTRIBUTE, preference);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Runs before first paint, inlined into <head>.
 *
 * The Zustand store uses `skipHydration`, so persisted preferences aren't read until after mount —
 * far too late for theming, which would show every dark-mode visitor a white flash. This reads the
 * same storage key directly and synchronously. It is deliberately dependency-free and defensive:
 * a throw here would block the page, so any failure silently falls through to the CSS default.
 */
export function themeInitScript(storageKey: string): string {
  return `(function(){try{
var raw=localStorage.getItem(${JSON.stringify(storageKey)});
if(!raw)return;
var pref=JSON.parse(raw).state.theme;
if(pref==='light'||pref==='dark'){document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},pref);}
}catch(e){}})();`;
}
