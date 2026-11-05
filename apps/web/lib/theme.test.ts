import { describe, expect, it } from 'vitest';
import {
  nextTheme,
  parseTheme,
  THEME_STORAGE_KEY,
  themeAttribute,
  themeScript,
  THEMES,
} from './theme.ts';

describe('theme', () => {
  it('parses stored values, defaulting to light', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme(null)).toBe('light');
    // "system" was a choice before; it now falls back to the default.
    expect(parseTheme('system')).toBe('light');
  });

  it('toggles between light and dark', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });

  it('sets an attribute only for dark', () => {
    expect(themeAttribute('light')).toBeNull();
    expect(themeAttribute('dark')).toBe('dark');
  });

  it('pre-paint script sets the same attribute as themeAttribute', () => {
    for (const stored of [...THEMES, 'system', 'sepia', null]) {
      const attrs = new Map<string, string>();
      const document = {
        documentElement: { setAttribute: (name: string, v: string) => attrs.set(name, v) },
      };
      const localStorage = {
        getItem: (key: string) => (key === THEME_STORAGE_KEY ? stored : null),
      };
      new Function('document', 'localStorage', themeScript)(document, localStorage);
      expect(attrs.get('data-theme') ?? null).toBe(themeAttribute(parseTheme(stored)));
    }
  });
});
