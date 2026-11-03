// The color theme the viewer picked. "system" follows prefers-color-scheme;
// light and dark pin it by setting data-theme on <html>, which globals.css
// reads. The choice lives in localStorage, a per-viewer convenience.

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'pulseboard:theme';

/** A stored value as a theme; anything unrecognized (or missing) is "system". */
export const parseTheme = (value: string | null): Theme =>
  THEMES.find((t) => t === value) ?? 'system';

/** The next theme when cycling through the toggle. */
export const nextTheme = (theme: Theme): Theme =>
  THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!;

/** The data-theme attribute for a theme: none for "system". */
export const themeAttribute = (theme: Theme): string | null => (theme === 'system' ? null : theme);

/**
 * Runs in <head> before first paint, so a pinned theme never flashes the
 * other one. Kept in step with parseTheme/themeAttribute by its tests.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
