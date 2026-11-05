import { describe, expect, it } from 'vitest';
import { isAffected, isPipelineQuery, queryKeys } from './queries.ts';

describe('isAffected', () => {
  const october = queryKeys.reports({ from: '2026-10-01', to: '2026-10-31' });

  it('refetches a range query when a rebuilt day is inside it', () => {
    expect(isAffected(october, ['2026-10-31'])).toBe(true);
    expect(isAffected(october, ['2026-09-30', '2026-10-01'])).toBe(true);
  });

  it('leaves a range query alone when every rebuilt day is outside it', () => {
    expect(isAffected(october, ['2026-09-30', '2026-11-01'])).toBe(false);
  });

  it('treats campaigns and orders like reports', () => {
    const range = { from: '2026-10-01', to: '2026-10-31' };
    expect(isAffected(queryKeys.campaigns(range, null), ['2026-10-15'])).toBe(true);
    expect(
      isAffected(queryKeys.orders(range, 'email', null, 'revenue', 'asc'), ['2026-11-15']),
    ).toBe(false);
  });

  it('always refetches status', () => {
    expect(isAffected(queryKeys.status(), ['2025-01-01'])).toBe(true);
  });

  it('never refetches what the pipeline does not produce, like a saved layout', () => {
    expect(
      isAffected(queryKeys.layout('7d444840-9dc0-4a8e-8f3f-0c3c0a9a7b1e'), ['2026-10-15']),
    ).toBe(false);
    expect(isAffected(['something', '2026-10-01', '2026-10-31'], ['2026-10-15'])).toBe(false);
  });
});

describe('isPipelineQuery', () => {
  it('covers reports, campaigns, orders and status, not layouts', () => {
    const range = { from: '2026-10-01', to: '2026-10-31' };
    expect(
      [
        queryKeys.reports(range),
        queryKeys.campaigns(range, null),
        queryKeys.orders(range, null, null),
        queryKeys.status(),
        queryKeys.layout('7d444840-9dc0-4a8e-8f3f-0c3c0a9a7b1e'),
      ].map(isPipelineQuery),
    ).toEqual([true, true, true, true, false]);
  });
});
