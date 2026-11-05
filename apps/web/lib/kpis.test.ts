import type { RangeSummary } from '@pulseboard/shared';
import { describe, expect, it } from 'vitest';
import { kpiTile } from './kpis.ts';

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
    expect(kpiTile('kpi.roas', 'all', paid, null)).toEqual({
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
    expect(kpiTile('kpi.orders', 'email', undefined, null)).toEqual({
      label: 'Orders',
      value: '0',
      caption: '—',
    });
  });

  it('derives the average order value', () => {
    expect(kpiTile('kpi.orders', 'all', paid, null).caption).toBe('$75.00 avg. order');
  });
});
