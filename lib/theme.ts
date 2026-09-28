/**
 * Named visual themes. Each theme is a token block in app/globals.css (`[data-theme="<id>"]`) plus
 * an entry here; components only ever reference the semantic tokens, so adding a theme never
 * touches a component.
 */
export const THEME_IDS = ['forest'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = 'forest';

export const THEME_ATTRIBUTE = 'data-theme';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  /** Doubles as the picker option's accessible description. */
  description: string;
  /** Browser-chrome colour; matches the theme's `--surface` so the address bar doesn't sit on a seam. */
  themeColor: string;
  /** Heading over the module grid. Themes voice it; it never carries data. */
  gridTitle: string;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  forest: {
    id: 'forest',
    label: 'Forest',
    description: 'Deep evergreen canopy with misty greens',
    themeColor: '#001711',
    gridTitle: 'Details',
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/**
 * Coerces anything saved or shared into a theme this version can render. Older versions stored
 * 'light' | 'dark' | 'system'; those looks were retired, so they (and anything unrecognised) land
 * on the default rather than being rejected — an old share link must keep opening.
 */
export function toThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function applyTheme(theme: ThemeId, root: HTMLElement): void {
  root.setAttribute(THEME_ATTRIBUTE, theme);
}

/**
 * Runs before first paint, inlined into <head>.
 *
 * The Zustand store uses `skipHydration`, so persisted preferences aren't read until after mount —
 * far too late for theming, which would flash the default theme at anyone who chose another. This
 * reads the same storage key directly and synchronously. It is deliberately dependency-free and
 * defensive: a throw here would block the page, so any failure leaves the server-rendered default.
 */
export function themeInitScript(storageKey: string): string {
  return `(function(){try{
var ids=${JSON.stringify(THEME_IDS)};
var raw=localStorage.getItem(${JSON.stringify(storageKey)});
if(!raw)return;
var t=JSON.parse(raw).state.theme;
if(ids.indexOf(t)!==-1){document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t);}
}catch(e){}})();`;
}
