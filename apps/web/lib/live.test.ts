import { describe, expect, it } from 'vitest';
import { affectsView, backoffMs } from './live.ts';

describe('affectsView', () => {
  const view = { from: '2026-10-01', to: '2026-10-29' };

  it('is true when any rebuilt day is in range, ends included', () => {
    expect(affectsView({ dates: ['2026-09-30', '2026-10-01'] }, view)).toBe(true);
    expect(affectsView({ dates: ['2026-10-29'] }, view)).toBe(true);
  });

  it('is false when every rebuilt day is outside the range', () => {
    expect(affectsView({ dates: ['2026-09-30', '2026-10-30'] }, view)).toBe(false);
  });
});

describe('backoffMs', () => {
  it('doubles from 1s and caps at 30s', () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(backoffMs)).toEqual([
      1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000,
    ]);
  });
});
