import { describe, expect, it } from 'vitest';
import { isAffected, queryKeys } from './queries.ts';

describe('isAffected', () => {
  const october = queryKeys.reports({ from: '2026-10-01', to: '2026-10-31' });

  it('refetches a range query when a rebuilt day is inside it', () => {
    expect(isAffected(october, ['2026-10-31'])).toBe(true);
    expect(isAffected(october, ['2026-09-30', '2026-10-01'])).toBe(true);
  });

  it('leaves a range query alone when every rebuilt day is outside it', () => {
    expect(isAffected(october, ['2026-09-30', '2026-11-01'])).toBe(false);
  });

  it('always refetches status, and anything without a range', () => {
    expect(isAffected(queryKeys.status(), ['2025-01-01'])).toBe(true);
    expect(isAffected(['something'], ['2025-01-01'])).toBe(true);
  });
});
