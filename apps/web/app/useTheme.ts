'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';
import {
  nextTheme,
  parseTheme,
  THEME_STORAGE_KEY,
  themeAttribute,
  type Theme,
} from '../lib/theme.ts';

// The theme lives on <html data-theme>, where the head script puts it before
// paint. Components read it from there, so the toggle, the command palette
// and the keyboard shortcut all see one value.

const root = () => document.documentElement;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(root(), { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

const snapshot = (): Theme => parseTheme(root().getAttribute('data-theme'));

function apply(theme: Theme) {
  const attr = themeAttribute(theme);
  if (attr) root().setAttribute('data-theme', attr);
  else root().removeAttribute('data-theme');
}

function stored(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'light';
  }
}

/** Switch theme and remember it for this browser. */
export function setTheme(theme: Theme) {
  apply(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
}

export const toggleTheme = () => setTheme(nextTheme(snapshot()));

/** The current theme. The server renders light; the client corrects it after hydration. */
export function useTheme(): Theme {
  // Re-apply the stored choice: React's dev-mode remount can clear what the
  // head script set on <html>.
  useLayoutEffect(() => apply(stored()), []);
  return useSyncExternalStore(subscribe, snapshot, () => 'light');
}
