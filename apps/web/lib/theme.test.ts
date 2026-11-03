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
  it('parses stored values, defaulting to system', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme(null)).toBe('system');
    expect(parseTheme('sepia')).toBe('system');
  });

  it('cycles system → light → dark → system', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });

  it('pins light and dark with an attribute, leaves system to the media query', () => {
    expect(themeAttribute('system')).toBeNull();
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
  });

  it('pre-paint script sets the same attribute as themeAttribute', () => {
    for (const stored of [...THEMES, 'sepia', null]) {
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
