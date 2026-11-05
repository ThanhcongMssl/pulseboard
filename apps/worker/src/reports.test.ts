import { describe, expect, it } from 'vitest';
import {
  CHANNELS,
  reportCampaignDailySchema,
  reportDailySchema,
  type RawTarget,
} from '@pulseboard/shared';
import { buildCampaignReports, buildDailyReports, type DayInputs } from './reports.ts';

const computedAt = new Date('2026-10-29T12:00:00Z');

const targetsFor = (month: string): RawTarget[] =>
  CHANNELS.map((channel) => ({ month, channel, revenueTarget: 3_100_000, spendBudget: 620_000 }));

const inputs = (overrides: Partial<DayInputs> = {}): DayInputs => ({
  date: '2026-10-29',
  sums: {
    paid_social: { spend: 10_000, sessions: 1_000, orders: 10, revenue: 40_000, newCustomers: 4 },
    paid_search: { spend: 90_000, sessions: 100, orders: 9, revenue: 90_000, newCustomers: 3 },
    organic: { spend: 0, sessions: 2_000, orders: 40, revenue: 120_000, newCustomers: 10 },
  },
  targets: targetsFor('2026-10'),
  staleSources: [],
  computedAt,
  ...overrides,
});

const byChannel = (docs: ReturnType<typeof buildDailyReports>) =>
  Object.fromEntries(docs.map((d) => [d.channel, d]));

describe('buildDailyReports', () => {
  it('returns one doc per channel plus an "all" row, all valid', () => {
    const docs = buildDailyReports(inputs());
    expect(docs.map((d) => d.channel)).toEqual([...CHANNELS, 'all']);
    expect(docs.map((d) => d._id)).toContain('2026-10-29:all');
    for (const doc of docs) expect(() => reportDailySchema.parse(doc)).not.toThrow();
  });

  it('computes channel KPIs', () => {
    const { paid_social } = byChannel(buildDailyReports(inputs()));
    expect(paid_social).toMatchObject({ roas: 4, cac: 2_500, conversionRate: 0.01 });
  });

  it('gives a channel without spend a null ROAS and CAC', () => {
    const { organic } = byChannel(buildDailyReports(inputs()));
    expect(organic).toMatchObject({ spend: 0, roas: null, cac: null, conversionRate: 0.02 });
  });

  it('reports channels without raw data as zeros with null ratios', () => {
    const { email } = byChannel(buildDailyReports(inputs()));
    expect(email).toMatchObject({
      spend: 0,
      sessions: 0,
      orders: 0,
      revenue: 0,
      roas: null,
      conversionRate: null,
    });
  });

  it('sums channels into the "all" row and derives its ratios from the totals', () => {
    const { all } = byChannel(buildDailyReports(inputs()));
    expect(all).toMatchObject({
      spend: 100_000,
      sessions: 3_100,
      orders: 59,
      revenue: 250_000,
      newCustomers: 17,
    });
    // Averaging the paid channels' ROAS (4 and 1) would give 2.5.
    expect(all?.roas).toBe(2.5);
    expect(all?.cac).toBe(Math.round(100_000 / 17));
    expect(all?.conversionRate).toBeCloseTo(59 / 3_100);
  });

  it('prorates monthly targets by the length of the month', () => {
    const october = byChannel(buildDailyReports(inputs()));
    expect(october.organic?.target).toEqual({ revenue: 100_000, spend: 20_000 });

    const feb = byChannel(
      buildDailyReports(inputs({ date: '2026-02-10', targets: targetsFor('2026-02') })),
    );
    expect(feb.organic?.target).toEqual({
      revenue: Math.round(3_100_000 / 28),
      spend: Math.round(620_000 / 28),
    });

    const nov = byChannel(
      buildDailyReports(inputs({ date: '2026-11-10', targets: targetsFor('2026-11') })),
    );
    expect(nov.organic?.target?.revenue).toBe(Math.round(3_100_000 / 30));
  });

  it('sums channel targets into the "all" target', () => {
    const { all } = byChannel(buildDailyReports(inputs()));
    expect(all?.target).toEqual({ revenue: 500_000, spend: 100_000 });
  });

  it('ignores targets for other months', () => {
    const docs = buildDailyReports(inputs({ targets: targetsFor('2026-09') }));
    expect(docs.every((d) => d.target === null)).toBe(true);
  });

  it('leaves the "all" target null when any channel lacks one', () => {
    const docs = byChannel(buildDailyReports(inputs({ targets: targetsFor('2026-10').slice(1) })));
    expect(docs.paid_social?.target).toBeNull();
    expect(docs.organic?.target).not.toBeNull();
    expect(docs.all?.target).toBeNull();
  });

  it('marks every row of the day with the stale sources', () => {
    const docs = buildDailyReports(inputs({ staleSources: ['ga4'] }));
    expect(docs.every((d) => d.staleSources.length === 1 && d.staleSources[0] === 'ga4')).toBe(
      true,
    );
  });
});

describe('buildCampaignReports', () => {
  const spend = (campaignId: string, amount: number) => ({
    campaignId,
    campaignName: `Campaign ${campaignId}`,
    channel: 'paid_search' as const,
    spend: amount,
    impressions: amount * 10,
    clicks: amount / 10,
  });
  const orders = (campaignId: string, n: number, revenue: number) => ({
    campaignId,
    channel: 'paid_search' as const,
    orders: n,
    revenue,
    newCustomers: n / 2,
  });

  it('joins delivery and attributed orders per campaign, with KPIs', () => {
    const [doc, ...rest] = buildCampaignReports({
      date: '2026-10-29',
      spend: [spend('gads_1', 1_000)],
      orders: [orders('gads_1', 4, 5_000)],
      computedAt,
    });
    expect(rest).toEqual([]);
    expect(reportCampaignDailySchema.parse(doc)).toEqual({
      _id: '2026-10-29:gads_1',
      date: '2026-10-29',
      channel: 'paid_search',
      campaignId: 'gads_1',
      campaignName: 'Campaign gads_1',
      spend: 1_000,
      impressions: 10_000,
      clicks: 100,
      orders: 4,
      revenue: 5_000,
      newCustomers: 2,
      roas: 5,
      cac: 500,
      ctr: 0.01,
      computedAt,
    });
  });

  it('keeps campaigns that spent without orders, and orders without a spend row', () => {
    const docs = buildCampaignReports({
      date: '2026-10-29',
      spend: [spend('gads_2', 1_000)],
      orders: [orders('gads_3', 2, 3_000)],
      computedAt,
    });
    expect(docs.map((d) => d.campaignId)).toEqual(['gads_2', 'gads_3']);
    expect(docs[0]).toMatchObject({ orders: 0, revenue: 0, roas: 0, cac: null });
    expect(docs[1]).toMatchObject({
      campaignName: 'gads_3',
      spend: 0,
      revenue: 3_000,
      roas: null,
      ctr: null,
    });
  });

  it('returns nothing for a day without paid activity', () => {
    expect(buildCampaignReports({ date: '2026-10-29', spend: [], orders: [], computedAt })).toEqual(
      [],
    );
  });
});
