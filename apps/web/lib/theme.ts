// The color theme the viewer picked: light by default, dark when they switch
// to it. Dark is set as data-theme on <html>, which globals.css reads; the
// choice lives in localStorage, a per-viewer convenience.

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'pulseboard:theme';

/** A stored value as a theme; anything unrecognized (or missing) is light. */
export const parseTheme = (value: string | null): Theme =>
  THEMES.find((t) => t === value) ?? 'light';

/** The other theme, for the toggle. */
export const nextTheme = (theme: Theme): Theme => (theme === 'light' ? 'dark' : 'light');

/** The data-theme attribute for a theme: none for light, the default in globals.css. */
export const themeAttribute = (theme: Theme): string | null => (theme === 'dark' ? 'dark' : null);

/**
 * Runs in <head> before first paint, so a stored dark theme never flashes
 * light. Kept in step with parseTheme/themeAttribute by its tests.
 */
export const themeScript = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
