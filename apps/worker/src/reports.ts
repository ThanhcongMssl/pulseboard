import {
  ALL_CHANNELS,
  cac,
  CHANNELS,
  conversionRate,
  ctr,
  DATA_VERSION,
  daysInMonth,
  monthOf,
  reportId,
  roas,
  type Channel,
  type IsoDate,
  type RawTarget,
  type ReportCampaignDaily,
  type ReportChannel,
  type ReportDaily,
  type Source,
} from '@pulseboard/shared';

/** One channel's raw totals for a day, as summed from the raw collections. */
export interface ChannelSums {
  spend: number;
  sessions: number;
  orders: number;
  revenue: number;
  newCustomers: number;
}

export interface DayInputs {
  date: IsoDate;
  /** A channel with no raw data at all may be missing; it reports as zeros. */
  sums: Partial<Record<Channel, ChannelSums>>;
  targets: readonly RawTarget[];
  staleSources: readonly Source[];
  computedAt: Date;
}

type Target = NonNullable<ReportDaily['target']>;

const ZERO: ChannelSums = { spend: 0, sessions: 0, orders: 0, revenue: 0, newCustomers: 0 };

const addSums = (a: ChannelSums, b: ChannelSums): ChannelSums => ({
  spend: a.spend + b.spend,
  sessions: a.sessions + b.sessions,
  orders: a.orders + b.orders,
  revenue: a.revenue + b.revenue,
  newCustomers: a.newCustomers + b.newCustomers,
});

/**
 * The day's reports_daily docs: one per channel plus the "all" totals row,
 * always CHANNELS.length + 1 of them. Ratios on the totals row are computed
 * from the totals, not averaged across channels, which would weight a tiny
 * channel the same as a big one.
 */
export function buildDailyReports({
  date,
  sums,
  targets,
  staleSources,
  computedAt,
}: DayInputs): ReportDaily[] {
  const month = monthOf(date);
  const days = daysInMonth(month);
  const targetFor = (channel: Channel): Target | null => {
    const row = targets.find((t) => t.month === month && t.channel === channel);
    if (!row) return null;
    return {
      revenue: Math.round(row.revenueTarget / days),
      spend: Math.round(row.spendBudget / days),
    };
  };

  const report = (channel: ReportChannel, s: ChannelSums, target: Target | null): ReportDaily => ({
    _id: reportId(date, channel),
    date,
    channel,
    ...s,
    roas: roas(s.revenue, s.spend),
    cac: cac(s.spend, s.newCustomers),
    conversionRate: conversionRate(s.orders, s.sessions),
    target,
    staleSources: [...staleSources],
    dataVersion: DATA_VERSION,
    computedAt,
  });

  const channelReports = CHANNELS.map((channel) =>
    report(channel, sums[channel] ?? ZERO, targetFor(channel)),
  );

  const totals = CHANNELS.reduce((acc, channel) => addSums(acc, sums[channel] ?? ZERO), ZERO);
  // A partial sum would look like a full target, so the total needs every channel's.
  const channelTargets = channelReports.map((r) => r.target);
  const totalTarget = channelTargets.every((t) => t !== null)
    ? channelTargets.reduce(
        (acc, t) => ({ revenue: acc.revenue + t.revenue, spend: acc.spend + t.spend }),
        {
          revenue: 0,
          spend: 0,
        },
      )
    : null;

  return [...channelReports, report(ALL_CHANNELS, totals, totalTarget)];
}

/** One campaign's ad delivery for a day, summed from raw_ad_spend. */
export interface CampaignSpend {
  campaignId: string;
  campaignName: string;
  channel: Channel;
  spend: number;
  impressions: number;
  clicks: number;
}

/** The orders attributed to one campaign on a day, summed from raw_orders. */
export interface CampaignOrders {
  campaignId: string;
  channel: Channel;
  orders: number;
  revenue: number;
  newCustomers: number;
}

export interface CampaignDayInputs {
  date: IsoDate;
  spend: readonly CampaignSpend[];
  orders: readonly CampaignOrders[];
  computedAt: Date;
}

/**
 * The day's reports_campaign_daily docs, sorted by campaign id: every
 * campaign that spent or was credited with an order. A campaign with orders
 * but no spend row (an ad platform that failed to ingest) still reports its
 * orders, with zero spend and its id as the name.
 */
export function buildCampaignReports({
  date,
  spend,
  orders,
  computedAt,
}: CampaignDayInputs): ReportCampaignDaily[] {
  const spendById = new Map(spend.map((s) => [s.campaignId, s]));
  const ordersById = new Map(orders.map((o) => [o.campaignId, o]));
  const ids = [...new Set([...spendById.keys(), ...ordersById.keys()])].sort();

  return ids.map((campaignId) => {
    const s = spendById.get(campaignId);
    const o = ordersById.get(campaignId);
    const delivery = {
      spend: s?.spend ?? 0,
      impressions: s?.impressions ?? 0,
      clicks: s?.clicks ?? 0,
    };
    const sales = {
      orders: o?.orders ?? 0,
      revenue: o?.revenue ?? 0,
      newCustomers: o?.newCustomers ?? 0,
    };
    return {
      _id: reportId(date, campaignId),
      date,
      channel: (s ?? o)!.channel,
      campaignId,
      campaignName: s?.campaignName ?? campaignId,
      ...delivery,
      ...sales,
      roas: roas(sales.revenue, delivery.spend),
      cac: cac(delivery.spend, sales.newCustomers),
      ctr: ctr(delivery.clicks, delivery.impressions),
      computedAt,
    };
  });
}
