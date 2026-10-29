import { describe, expect, it } from 'vitest';
import type { ReportChannel, ReportDailyJson, Source } from '@pulseboard/shared';
import { channelStack, dailySeries, staleDays, targetPacing } from './series.ts';

const report = (
  date: string,
  channel: ReportChannel,
  revenue: number,
  extra: { target?: number | null; stale?: Source[] } = {},
): ReportDailyJson => ({
  _id: `${date}:${channel}`,
  date,
  channel,
  spend: 100,
  revenue,
  orders: 1,
  newCustomers: 1,
  sessions: 10,
  roas: null,
  cac: null,
  conversionRate: null,
  target:
    extra.target === undefined || extra.target === null
      ? null
      : { revenue: extra.target, spend: 0 },
  staleSources: extra.stale ?? [],
  computedAt: '2026-10-29T00:00:00.000Z',
});

describe('dailySeries', () => {
  it('has one point per date and leaves missing days as gaps', () => {
    const reports = [
      report('2026-10-01', 'all', 500, { target: 400 }),
      report('2026-10-01', 'email', 9),
    ];
    expect(dailySeries(reports, 'all', ['2026-10-01', '2026-10-02'])).toEqual([
      { date: '2026-10-01', revenue: 500, spend: 100, targetRevenue: 400 },
      { date: '2026-10-02', revenue: null, spend: null, targetRevenue: null },
    ]);
  });
});

describe('channelStack', () => {
  it('puts each channel revenue on its date and skips the all row', () => {
    const reports = [
      report('2026-10-01', 'email', 10),
      report('2026-10-01', 'organic', 20),
      report('2026-10-01', 'all', 30),
    ];
    expect(channelStack(reports, ['2026-10-01', '2026-10-02'])).toEqual([
      { date: '2026-10-01', email: 10, organic: 20 },
      { date: '2026-10-02' },
    ]);
  });
});

describe('staleDays', () => {
  it('collects distinct stale sources per day, oldest first', () => {
    const reports = [
      report('2026-10-02', 'all', 0, { stale: ['shopify'] }),
      report('2026-10-02', 'email', 0, { stale: ['shopify', 'ga4'] }),
      report('2026-10-01', 'all', 0, { stale: ['ga4'] }),
      report('2026-10-03', 'all', 0),
    ];
    expect(staleDays(reports)).toEqual([
      { date: '2026-10-01', sources: ['ga4'] },
      { date: '2026-10-02', sources: ['ga4', 'shopify'] },
    ]);
  });
});

describe('targetPacing', () => {
  it('compares range revenue with the summed targets', () => {
    const reports = [
      report('2026-10-01', 'all', 600, { target: 500 }),
      report('2026-10-02', 'all', 450, { target: 500 }),
    ];
    expect(targetPacing(reports, 'all')).toEqual({ revenue: 1_050, target: 1_000, ratio: 1.05 });
  });

  it('is null when any day lacks a target', () => {
    const reports = [
      report('2026-10-01', 'all', 600, { target: 500 }),
      report('2026-10-02', 'all', 450),
    ];
    expect(targetPacing(reports, 'all')).toBeNull();
    expect(targetPacing([], 'all')).toBeNull();
  });
});
