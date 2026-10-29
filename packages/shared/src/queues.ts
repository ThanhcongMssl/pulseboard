import type { IsoDate, ReportChannel, Source } from './domain.ts';

/** BullMQ queue names, shared by the worker (consumer) and anything that enqueues. */
export const QUEUES = {
  ingest: 'ingest',
  aggregate: 'aggregate',
} as const;

export interface IngestJobData {
  source: Source;
  date: IsoDate;
}

export interface AggregateJobData {
  date: IsoDate;
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
