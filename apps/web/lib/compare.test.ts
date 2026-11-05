import type { RangeSummary, ReportDailyJson } from '@pulseboard/shared';
import { describe, expect, it } from 'vitest';
import { coversRange, describeDelta, kpiDelta, previousRange, withPrevious } from './compare.ts';

const summary = (s: Partial<RangeSummary>): RangeSummary => ({
  spend: 100_000,
  revenue: 300_000,
  orders: 40,
  newCustomers: 20,
  sessions: 2_000,
  roas: 3,
  cac: 5_000,
  conversionRate: 0.02,
  ...s,
});

describe('previousRange', () => {
  it('is the same length, ending the day before', () => {
    expect(previousRange({ from: '2026-10-30', to: '2026-11-05' })).toEqual({
      from: '2026-10-23',
      to: '2026-10-29',
    });
    expect(previousRange({ from: '2026-03-01', to: '2026-03-01' })).toEqual({
      from: '2026-02-28',
      to: '2026-02-28',
    });
  });
});

describe('coversRange', () => {
  const row = (date: string, channel = 'all') => ({ date, channel }) as ReportDailyJson;
  const range = { from: '2026-10-01', to: '2026-10-03' };

  it('needs a report for every day of the channel', () => {
    const rows = ['2026-10-01', '2026-10-02', '2026-10-03'].map((d) => row(d));
    expect(coversRange(rows, 'all', range)).toBe(true);
    expect(coversRange(rows.slice(1), 'all', range)).toBe(false);
    expect(coversRange(rows, 'email', range)).toBe(false);
  });
});

describe('kpiDelta', () => {
  it('is good when revenue grows', () => {
    expect(kpiDelta('kpi.revenue', summary({ revenue: 330_000 }), summary({}))).toEqual({
      change: expect.closeTo(0.1, 10),
      direction: 'up',
      tone: 'good',
    });
  });

  it('is bad when CAC grows, and good when it falls', () => {
    expect(kpiDelta('kpi.cac', summary({ cac: 6_000 }), summary({}))?.tone).toBe('bad');
    expect(kpiDelta('kpi.cac', summary({ cac: 4_000 }), summary({}))?.tone).toBe('good');
  });

  it('keeps spend neutral, and calls tiny changes flat', () => {
    expect(kpiDelta('kpi.spend', summary({ spend: 150_000 }), summary({}))?.tone).toBe('neutral');
    expect(kpiDelta('kpi.orders', summary({}), summary({}))).toMatchObject({
      direction: 'flat',
      tone: 'neutral',
    });
  });

  it('is null without a baseline', () => {
    expect(kpiDelta('kpi.revenue', summary({}), undefined)).toBeNull();
    expect(kpiDelta('kpi.revenue', summary({}), summary({ revenue: 0 }))).toBeNull();
    expect(kpiDelta('kpi.roas', summary({}), summary({ roas: null }))).toBeNull();
    expect(kpiDelta('kpi.roas', summary({ roas: null }), summary({}))).toBeNull();
  });
});

describe('describeDelta', () => {
  it('writes an arrow and a sentence', () => {
    expect(describeDelta({ change: -0.042, direction: 'down', tone: 'bad' })).toEqual({
      short: '▼ 4.2%',
      long: 'Down 4.2% from the previous period',
    });
  });
});

describe('withPrevious', () => {
  it('matches days by position', () => {
    const p = (date: string, revenue: number | null) => ({
      date,
      revenue,
      spend: null,
      targetRevenue: null,
    });
    expect(withPrevious([p('2026-10-08', 5), p('2026-10-09', 6)], [p('2026-10-01', 1)])).toEqual([
      { ...p('2026-10-08', 5), previousRevenue: 1 },
      { ...p('2026-10-09', 6), previousRevenue: null },
    ]);
  });
});
