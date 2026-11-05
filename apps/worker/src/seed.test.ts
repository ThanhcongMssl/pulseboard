import { describe, expect, it } from 'vitest';
import { staleDays } from './seed.ts';

const WINDOW = ['2026-11-03', '2026-11-04', '2026-11-05'];

describe('staleDays', () => {
  it('builds every day of an empty or outdated database', () => {
    expect(staleDays(WINDOW, [])).toEqual(WINDOW);
  });

  it('builds only the days missing an up-to-date report', () => {
    expect(staleDays(WINDOW, ['2026-11-03', '2026-11-05'])).toEqual(['2026-11-04']);
  });

  it('builds nothing once the window is done, ignoring days outside it', () => {
    expect(staleDays(WINDOW, [...WINDOW, '2026-10-01'])).toEqual([]);
  });
});
