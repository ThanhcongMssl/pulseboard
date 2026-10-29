import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportsQuerySchema, summarizeReports } from './api.ts';
import { reportsUpdatedEventSchema } from './queues.ts';

describe('reportsQuerySchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('defaults to the 30 days ending today', () => {
    expect(reportsQuerySchema.parse({})).toEqual({ from: '2026-09-30', to: '2026-10-29' });
  });

  it('defaults from to the 30 days ending on to', () => {
    expect(reportsQuerySchema.parse({ to: '2026-03-31' })).toEqual({
      from: '2026-03-02',
      to: '2026-03-31',
    });
  });

  it('keeps an explicit range and channel', () => {
    expect(
      reportsQuerySchema.parse({ from: '2026-10-01', to: '2026-10-01', channel: 'all' }),
    ).toEqual({ from: '2026-10-01', to: '2026-10-01', channel: 'all' });
  });

  it('rejects from after to', () => {
    expect(reportsQuerySchema.safeParse({ from: '2026-10-02', to: '2026-10-01' }).success).toBe(
      false,
    );
  });

  it('allows 366 days but not 367', () => {
    expect(reportsQuerySchema.safeParse({ from: '2025-10-29', to: '2026-10-29' }).success).toBe(
      true,
    );
    expect(reportsQuerySchema.safeParse({ from: '2025-10-28', to: '2026-10-29' }).success).toBe(
      false,
    );
  });

  it.each([{ channel: 'tv' }, { from: '2026-13-01' }, { to: '29/10/2026' }, { channel: ['all'] }])(
    'rejects %o',
    (query) => {
      expect(reportsQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});

describe('summarizeReports', () => {
  const row = (channel: 'paid_social' | 'email', spend: number, revenue: number, orders = 0) => ({
    channel,
    spend,
    revenue,
    orders,
    newCustomers: orders,
    sessions: orders * 10,
  });

  it('sums each channel and derives ratios from the totals', () => {
    // Daily ROAS 1.0 and 3.0 average to 2.0; the range's real ROAS is 1_300 / 1_100.
    const summary = summarizeReports([
      row('paid_social', 1_000, 1_000, 2),
      row('paid_social', 100, 300, 1),
    ]);
    expect(summary.paid_social).toEqual({
      spend: 1_100,
      revenue: 1_300,
      orders: 3,
      newCustomers: 3,
      sessions: 30,
      roas: 1_300 / 1_100,
      cac: Math.round(1_100 / 3),
      conversionRate: 0.1,
    });
  });

  it('only includes channels present, with null ratios on zero denominators', () => {
    const summary = summarizeReports([row('email', 0, 0)]);
    expect(Object.keys(summary)).toEqual(['email']);
    expect(summary.email).toMatchObject({ roas: null, cac: null, conversionRate: null });
  });
});

describe('reportsUpdatedEventSchema', () => {
  it('accepts what the worker publishes', () => {
    const event = {
      type: 'reports.updated',
      dates: ['2026-10-29'],
      channels: ['paid_social', 'all'],
      computedAt: new Date().toISOString(),
    };
    expect(reportsUpdatedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects other shapes', () => {
    expect(reportsUpdatedEventSchema.safeParse({ type: 'hello' }).success).toBe(false);
  });
});
