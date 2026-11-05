import {
  cac,
  CHANNELS,
  conversionRate,
  datesInRange,
  roas,
  summarizeCampaigns,
  summarizeReports,
  type CampaignsResponse,
  type Channel,
  type DateRange,
  type OrderJson,
  type ReportChannel,
  type ReportDailyJson,
  type ReportsResponse,
} from '@pulseboard/shared';

// Deterministic data for stories: a fixed 30-day range and a seeded random
// walk, so every story renders the same numbers on every machine.

export const RANGE: DateRange = { from: '2026-10-07', to: '2026-11-05' };
export const PREVIOUS: DateRange = { from: '2026-09-07', to: '2026-10-06' };

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE: Record<Channel, { revenue: number; spend: number; sessions: number }> = {
  paid_social: { revenue: 500_000, spend: 175_000, sessions: 5_000 },
  paid_search: { revenue: 720_000, spend: 220_000, sessions: 3_700 },
  organic: { revenue: 860_000, spend: 0, sessions: 6_900 },
  email: { revenue: 440_000, spend: 0, sessions: 1_800 },
  direct: { revenue: 610_000, spend: 0, sessions: 2_400 },
};

function row(
  date: string,
  channel: ReportChannel,
  v: Omit<
    ReportDailyJson,
    | 'date'
    | 'channel'
    | '_id'
    | 'roas'
    | 'cac'
    | 'conversionRate'
    | 'target'
    | 'staleSources'
    | 'dataVersion'
    | 'computedAt'
  >,
  target: number,
): ReportDailyJson {
  return {
    _id: `${date}:${channel}`,
    date,
    channel,
    ...v,
    roas: roas(v.revenue, v.spend),
    cac: cac(v.spend, v.newCustomers),
    conversionRate: conversionRate(v.orders, v.sessions),
    target: { revenue: target, spend: 0 },
    staleSources: [],
    dataVersion: 1,
    computedAt: '2026-11-05T06:00:00.000Z',
  };
}

/** Daily reports for every channel plus the "all" totals row, like /reports returns. */
export function reports(range: DateRange, seed = 1): ReportsResponse {
  const next = random(seed);
  const rows: ReportDailyJson[] = [];
  for (const date of datesInRange(range)) {
    const day = CHANNELS.map((channel) => {
      const b = BASE[channel];
      const k = 0.8 + next() * 0.4;
      const revenue = Math.round(b.revenue * k);
      const orders = Math.round(revenue / 6_500);
      return row(
        date,
        channel,
        {
          revenue,
          spend: Math.round(b.spend * (0.9 + next() * 0.2)),
          orders,
          newCustomers: Math.round(orders * 0.6),
          sessions: Math.round(b.sessions * (0.9 + next() * 0.2)),
        },
        Math.round(b.revenue * 0.95),
      );
    });
    const sum = (key: 'revenue' | 'spend' | 'orders' | 'newCustomers' | 'sessions') =>
      day.reduce((s, r) => s + r[key], 0);
    rows.push(
      ...day,
      row(
        date,
        'all',
        {
          revenue: sum('revenue'),
          spend: sum('spend'),
          orders: sum('orders'),
          newCustomers: sum('newCustomers'),
          sessions: sum('sessions'),
        },
        day.reduce((s, r) => s + r.target!.revenue, 0),
      ),
    );
  }
  return {
    from: range.from,
    to: range.to,
    channel: null,
    reports: rows,
    summary: summarizeReports(rows),
  };
}

const CAMPAIGNS = [
  {
    campaignId: 'fb_1',
    campaignName: 'Prospecting · Lookalike',
    channel: 'paid_social',
    share: 0.3,
  },
  {
    campaignId: 'fb_2',
    campaignName: 'Retargeting · Site visitors',
    channel: 'paid_social',
    share: 0.45,
  },
  { campaignId: 'fb_3', campaignName: 'Awareness · Video', channel: 'paid_social', share: 0.25 },
  { campaignId: 'gads_1', campaignName: 'Brand search', channel: 'paid_search', share: 0.4 },
  { campaignId: 'gads_2', campaignName: 'Generic search', channel: 'paid_search', share: 0.25 },
  { campaignId: 'gads_3', campaignName: 'Shopping', channel: 'paid_search', share: 0.35 },
] as const;

/** Range totals per campaign, derived from the paid channels' totals. */
export function campaigns(range: DateRange): CampaignsResponse {
  const { summary } = reports(range);
  const rows = CAMPAIGNS.map((c) => {
    const s = summary[c.channel]!;
    const spend = Math.round(s.spend * c.share);
    return {
      ...c,
      spend,
      revenue: Math.round(s.revenue * c.share * (c.campaignId.endsWith('2') ? 1.3 : 0.9)),
      impressions: Math.round(spend / 2),
      clicks: Math.round(spend / 60),
      orders: Math.round(s.orders * c.share),
      newCustomers: Math.round(s.newCustomers * c.share),
    };
  });
  return { from: range.from, to: range.to, channel: null, campaigns: summarizeCampaigns(rows) };
}

/** `n` orders, newest first. */
export function orders(n: number): OrderJson[] {
  const next = random(7);
  const days = datesInRange(RANGE).reverse();
  return Array.from({ length: n }, (_, i) => {
    const channel = CHANNELS[Math.floor(next() * CHANNELS.length)]!;
    const paid = channel === 'paid_social' || channel === 'paid_search';
    const campaign = CAMPAIGNS.filter((c) => c.channel === channel)[Math.floor(next() * 3)];
    const date = days[Math.floor(i / (n / days.length))] ?? days.at(-1)!;
    return {
      orderId: `${date}-${channel}-${i}`,
      date,
      channel,
      campaignId: paid && campaign ? campaign.campaignId : null,
      revenue: 3_000 + Math.round(next() * 12_000),
      isNewCustomer: next() < 0.55,
    };
  });
}
