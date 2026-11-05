import type { RangeSummary, ReportDailyJson } from '@pulseboard/shared';
import { describe, expect, it } from 'vitest';
import { kpiSeries, kpiTile } from './kpis.ts';

const paid: RangeSummary = {
  spend: 100_000,
  revenue: 300_000,
  orders: 40,
  newCustomers: 20,
  sessions: 2_000,
  roas: 3,
  cac: 5_000,
  conversionRate: 0.02,
};
const organic: RangeSummary = { ...paid, spend: 0, roas: null, cac: null };

describe('kpiTile', () => {
  it('labels the totals ROAS as blended', () => {
    expect(kpiTile('kpi.roas', 'all', paid, null)).toMatchObject({
      label: 'Blended ROAS',
      value: '3.00×',
      caption: 'All revenue ÷ ad spend',
    });
    expect(kpiTile('kpi.roas', 'paid_search', paid, null).label).toBe('ROAS');
  });

  it('shows dashes, not zeros, for ratios of an unpaid channel', () => {
    expect(kpiTile('kpi.roas', 'organic', organic, null)).toMatchObject({
      value: '—',
      caption: 'No ad spend',
    });
    expect(kpiTile('kpi.cac', 'organic', organic, null)).toMatchObject({
      value: '—',
      caption: 'No ad spend',
    });
  });

  it('shows pacing when every day has a target', () => {
    const pacing = { revenue: 300_000, target: 250_000, ratio: 1.2 };
    expect(kpiTile('kpi.revenue', 'all', paid, pacing).caption).toBe('120% of target');
    expect(kpiTile('kpi.revenue', 'all', paid, null).caption).toBe('No target set');
  });

  it('renders zeros for a channel without a summary', () => {
    expect(kpiTile('kpi.orders', 'email', undefined, null)).toMatchObject({
      label: 'Orders',
      value: '0',
      caption: '—',
      raw: 0,
    });
  });

  it('derives the average order value', () => {
    expect(kpiTile('kpi.orders', 'all', paid, null).caption).toBe('$75.00 avg. order');
  });

  it('exposes the raw number and its formatter, for animating', () => {
    const tile = kpiTile('kpi.cac', 'paid_search', paid, null);
    expect(tile.raw).toBe(5_000);
    expect(tile.format(4_321)).toBe('$43.21');
    expect(kpiTile('kpi.roas', 'organic', organic, null).raw).toBeNull();
  });
});

describe('kpiSeries', () => {
  it('reads the metric per day for the channel, with gaps', () => {
    const row = (date: string, channel: string, roas: number | null) =>
      ({ date, channel, roas }) as ReportDailyJson;
    const reports = [
      row('2026-10-01', 'all', 2),
      row('2026-10-02', 'email', 9),
      row('2026-10-03', 'all', null),
    ];
    expect(
      kpiSeries('kpi.roas', reports, 'all', ['2026-10-01', '2026-10-02', '2026-10-03']),
    ).toEqual([2, null, null]);
  });
});
