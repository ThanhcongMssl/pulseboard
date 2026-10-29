import { lastNDays, reportChannelSchema, type ReportChannel } from '@pulseboard/shared';

/** Range presets in days, ending today (UTC). */
export const RANGE_PRESETS = [7, 30, 90] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export interface Filters {
  range: RangePreset;
  channel: ReportChannel;
}

export const DEFAULT_FILTERS: Filters = { range: 30, channel: 'all' };

interface ParamsLike {
  get(name: string): string | null;
}

/** Filters from the URL; anything unrecognized falls back to the default. */
export function parseFilters(params: ParamsLike): Filters {
  const range = Number(params.get('range'));
  const channel = reportChannelSchema.safeParse(params.get('channel'));
  return {
    range: RANGE_PRESETS.find((p) => p === range) ?? DEFAULT_FILTERS.range,
    channel: channel.success ? channel.data : DEFAULT_FILTERS.channel,
  };
}

/** The URL search string for `filters`, leaving defaults out to keep links short. */
export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.range !== DEFAULT_FILTERS.range) params.set('range', String(filters.range));
  if (filters.channel !== DEFAULT_FILTERS.channel) params.set('channel', filters.channel);
  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * The /reports query for `filters`. Always the full range across channels:
 * the table and mix chart need every channel even when one is selected.
 */
export function toQuery(filters: Filters, today?: string): { from: string; to: string } {
  const days = lastNDays(filters.range, today);
  return { from: days[0]!, to: days.at(-1)! };
}
