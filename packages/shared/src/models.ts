import { z } from 'zod';
import {
  centsSchema,
  channelSchema,
  isoDateSchema,
  isoMonthSchema,
  reportChannelSchema,
  sourceSchema,
} from './domain.ts';

const count = z.int().nonnegative();

// Raw collections hold source data as ingested. Each schema's comment names
// its natural key: ingest upserts on that key, so re-running a job for the
// same day overwrites rows instead of duplicating them.

/** raw_ad_spend — key: (source, date, campaignId) */
export const rawAdSpendSchema = z.object({
  source: sourceSchema,
  date: isoDateSchema,
  channel: channelSchema,
  campaignId: z.string().min(1),
  spend: centsSchema,
  impressions: count,
  clicks: count,
});
export type RawAdSpend = z.infer<typeof rawAdSpendSchema>;

/** raw_traffic — key: (source, date, channel) */
export const rawTrafficSchema = z.object({
  source: sourceSchema,
  date: isoDateSchema,
  channel: channelSchema,
  sessions: count,
  users: count,
});
export type RawTraffic = z.infer<typeof rawTrafficSchema>;

/** raw_orders — key: (source, orderId) */
export const rawOrderSchema = z.object({
  source: sourceSchema,
  orderId: z.string().min(1),
  date: isoDateSchema,
  channel: channelSchema,
  revenue: centsSchema,
  isNewCustomer: z.boolean(),
});
export type RawOrder = z.infer<typeof rawOrderSchema>;

/** raw_targets — key: (month, channel) */
export const rawTargetSchema = z.object({
  month: isoMonthSchema,
  channel: channelSchema,
  revenueTarget: centsSchema,
  spendBudget: centsSchema,
});
export type RawTarget = z.infer<typeof rawTargetSchema>;

/**
 * reports_daily — the read model. One precomputed, denormalized document per
 * (date, channel), plus a channel "all" totals row, so report reads never
 * aggregate at request time. `_id` is `${date}:${channel}`.
 */
export const reportDailySchema = z.object({
  _id: z.string(),
  date: isoDateSchema,
  channel: reportChannelSchema,
  spend: centsSchema,
  revenue: centsSchema,
  orders: count,
  newCustomers: count,
  sessions: count,
  roas: z.number().nullable(),
  cac: z.number().nullable(),
  conversionRate: z.number().nullable(),
  // Monthly target prorated to the day; null when no target row exists.
  target: z.object({ revenue: centsSchema, spend: centsSchema }).nullable(),
  computedAt: z.date(),
});
export type ReportDaily = z.infer<typeof reportDailySchema>;

export const reportId = (date: string, channel: string) => `${date}:${channel}`;

export const INGEST_STATUSES = ['running', 'succeeded', 'failed'] as const;

/**
 * ingest_runs — one doc per job attempt, key: (jobId, attempt). Job history;
 * also feeds the dashboard's "last updated" badge.
 */
export const ingestRunSchema = z.object({
  jobId: z.string(),
  attempt: z.int().positive(),
  source: sourceSchema,
  date: isoDateSchema,
  status: z.enum(INGEST_STATUSES),
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  recordCount: count.nullable(),
  error: z.string().nullable(),
  // The final attempt failed: this date's reports are built from the
  // source's last good data. Failures that will still be retried are not stale.
  stale: z.boolean(),
});
export type IngestRun = z.infer<typeof ingestRunSchema>;
