import { z } from 'zod';
import { isoDateSchema, reportChannelSchema, type IsoDate, type Source } from './domain.ts';

/** BullMQ queue names, shared by the worker (consumer) and anything that enqueues. */
export const QUEUES = {
  ingest: 'ingest',
  aggregate: 'aggregate',
  schedule: 'schedule',
} as const;

export interface IngestJobData {
  source: Source;
  date: IsoDate;
}

export interface AggregateJobData {
  date: IsoDate;
  /** Identifies the flow, so the aggregate can name its ingest children. */
  runId: string;
}

/** Repeatable trigger: start one ingest flow for each of the last `days` days. */
export interface ScheduleJobData {
  days: number;
}

/** Redis pub/sub channel the worker publishes to after rebuilding reports. */
export const REPORTS_UPDATED_CHANNEL = 'pulseboard:reports-updated';

/**
 * Published after reports are rebuilt and relayed to dashboards over WebSocket.
 * A schema, not just a type, because the API reads it back off Redis.
 */
export const reportsUpdatedEventSchema = z.object({
  type: z.literal('reports.updated'),
  dates: z.array(isoDateSchema),
  channels: z.array(reportChannelSchema),
  computedAt: z.iso.datetime(),
});
export type ReportsUpdatedEvent = z.infer<typeof reportsUpdatedEventSchema>;

/** Every message the API sends on /ws. */
export type WsMessage = { type: 'hello' } | ReportsUpdatedEvent;
