import { z } from 'zod';

/** Marketing channels every source maps its data onto. */
export const CHANNELS = ['paid_social', 'paid_search', 'organic', 'email', 'direct'] as const;
export const channelSchema = z.enum(CHANNELS);
export type Channel = z.infer<typeof channelSchema>;

/** Reports also carry a cross-channel totals row. */
export const ALL_CHANNELS = 'all' as const;
export const reportChannelSchema = z.union([channelSchema, z.literal(ALL_CHANNELS)]);
export type ReportChannel = z.infer<typeof reportChannelSchema>;

/** Upstream systems we ingest from (simulated connectors in the demo). */
export const SOURCES = ['facebook_ads', 'ga4', 'shopify', 'sheets_targets'] as const;
export const sourceSchema = z.enum(SOURCES);
export type Source = z.infer<typeof sourceSchema>;

/** Calendar day in UTC, `YYYY-MM-DD`. Sorts lexicographically. */
export const isoDateSchema = z.iso.date();
export type IsoDate = z.infer<typeof isoDateSchema>;

/** Calendar month, `YYYY-MM`. */
export const isoMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export type IsoMonth = z.infer<typeof isoMonthSchema>;

/** Money is stored as integer minor units (cents) so sums never drift. */
export const centsSchema = z.int().nonnegative();
