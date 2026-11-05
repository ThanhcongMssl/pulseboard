import {
  addDays,
  datesInRange,
  isoDateSchema,
  lastNDays,
  MAX_RANGE_DAYS,
  reportChannelSchema,
  todayUtc,
  type DateRange,
  type IsoDate,
  type ReportChannel,
} from '@pulseboard/shared';

// The dashboard's view state, which lives in the URL so every step of an
// analysis is a link and back/forward walk through them. Pure: parsing,
// serializing and every transition are tested without a router.

/** Range presets in days, ending today (UTC). */
export const RANGE_PRESETS = [7, 30, 90] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

/** The last N days ending today, or a fixed range (custom dates, or a chart zoom). */
export type RangeSpec = { preset: RangePreset } | DateRange;

export interface Filters {
  range: RangeSpec;
  channel: ReportChannel;
  /** A campaign to narrow the orders to; it belongs to `channel` when set from the UI. */
  campaign: string | null;
  /** Compare with the previous period of the same length. */
  compare: boolean;
}

export const DEFAULT_PRESET: RangePreset = 30;

export const DEFAULT_FILTERS: Filters = {
  range: { preset: DEFAULT_PRESET },
  channel: 'all',
  campaign: null,
  compare: false,
};

export const isPreset = (range: RangeSpec): range is { preset: RangePreset } => 'preset' in range;

interface ParamsLike {
  get(name: string): string | null;
}

const CAMPAIGN_ID = /^[\w-]{1,64}$/;

/**
 * A custom range from the URL, or null unless it's usable: two valid dates in
 * order, no longer than the API allows, and not ending in the future.
 */
export function parseCustomRange(
  from: string | null,
  to: string | null,
  today: IsoDate = todayUtc(),
): DateRange | null {
  const f = isoDateSchema.safeParse(from);
  const t = isoDateSchema.safeParse(to);
  if (!f.success || !t.success) return null;
  const range = { from: f.data, to: t.data };
  if (range.from > range.to || range.to > today) return null;
  return datesInRange(range).length <= MAX_RANGE_DAYS ? range : null;
}

/** Filters from the URL; anything unrecognized falls back to the default. */
export function parseFilters(params: ParamsLike, today: IsoDate = todayUtc()): Filters {
  const preset = RANGE_PRESETS.find((p) => p === Number(params.get('range')));
  const custom = parseCustomRange(params.get('from'), params.get('to'), today);
  const channel = reportChannelSchema.safeParse(params.get('channel'));
  const campaign = params.get('campaign');
  return {
    range: custom ?? { preset: preset ?? DEFAULT_PRESET },
    channel: channel.success ? channel.data : DEFAULT_FILTERS.channel,
    campaign: campaign && CAMPAIGN_ID.test(campaign) ? campaign : null,
    compare: params.get('compare') === 'prev',
  };
}

/** The URL search string for `filters`, leaving defaults out to keep links short. */
export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();
  const { range } = filters;
  if (!isPreset(range)) {
    params.set('from', range.from);
    params.set('to', range.to);
  } else if (range.preset !== DEFAULT_PRESET) {
    params.set('range', String(range.preset));
  }
  if (filters.channel !== DEFAULT_FILTERS.channel) params.set('channel', filters.channel);
  if (filters.campaign) params.set('campaign', filters.campaign);
  if (filters.compare) params.set('compare', 'prev');
  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * The date range `filters` show, inclusive. Always every channel: the table
 * and mix chart need them all even when one is selected.
 */
export function toQuery(filters: Filters, today: IsoDate = todayUtc()): DateRange {
  if (!isPreset(filters.range)) return filters.range;
  const days = lastNDays(filters.range.preset, today);
  return { from: days[0]!, to: days.at(-1)! };
}

export const withRange = (filters: Filters, range: RangeSpec): Filters => ({ ...filters, range });

/** Focus a channel. A campaign belongs to one channel, so it's dropped when the channel changes. */
export const withChannel = (filters: Filters, channel: ReportChannel): Filters => ({
  ...filters,
  channel,
  campaign: channel === filters.channel ? filters.campaign : null,
});

/** Select a channel from a chart or table, or deselect it (back to all) when it's already selected. */
export const toggleChannel = (filters: Filters, channel: ReportChannel): Filters =>
  withChannel(filters, filters.channel === channel && channel !== 'all' ? 'all' : channel);

/** Select a campaign (and its channel), or deselect it when it's already selected. */
export const toggleCampaign = (
  filters: Filters,
  campaignId: string,
  channel: ReportChannel,
): Filters =>
  filters.campaign === campaignId
    ? { ...filters, campaign: null }
    : { ...filters, channel, campaign: campaignId };

/**
 * Leave a custom range for the shortest preset that still contains it, so
 * zooming out lands near where the zoom started; the default when none does.
 */
export function presetCovering(range: DateRange, today: IsoDate = todayUtc()): RangePreset {
  return (
    RANGE_PRESETS.find((p) => range.from >= addDays(today, -(p - 1)) && range.to <= today) ??
    DEFAULT_PRESET
  );
}

/** How many filters differ from the defaults, for the phone's "Filters · 2" button. */
export const activeFilterCount = (filters: Filters): number =>
  [
    !isPreset(filters.range) || filters.range.preset !== DEFAULT_PRESET,
    filters.channel !== DEFAULT_FILTERS.channel,
    filters.campaign !== null,
    filters.compare,
  ].filter(Boolean).length;
