import type { IsoDate, ReportChannel, Source } from './domain.ts';

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

/** Message pushed to dashboards over WebSocket when reports change. */
export interface ReportsUpdatedEvent {
  type: 'reports.updated';
  dates: IsoDate[];
  channels: ReportChannel[];
  computedAt: string;
}
