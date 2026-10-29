import type { Db } from 'mongodb';
import type {
  IngestRun,
  RawAdSpend,
  RawOrder,
  RawTarget,
  RawTraffic,
  ReportDaily,
} from '@pulseboard/shared';

export const COLLECTIONS = {
  rawAdSpend: 'raw_ad_spend',
  rawTraffic: 'raw_traffic',
  rawOrders: 'raw_orders',
  rawTargets: 'raw_targets',
  reportsDaily: 'reports_daily',
  ingestRuns: 'ingest_runs',
} as const;

/** Typed handles to every collection, so callers never pass names as strings. */
export const collections = (db: Db) => ({
  rawAdSpend: db.collection<RawAdSpend>(COLLECTIONS.rawAdSpend),
  rawTraffic: db.collection<RawTraffic>(COLLECTIONS.rawTraffic),
  rawOrders: db.collection<RawOrder>(COLLECTIONS.rawOrders),
  rawTargets: db.collection<RawTarget>(COLLECTIONS.rawTargets),
  reportsDaily: db.collection<ReportDaily>(COLLECTIONS.reportsDaily),
  ingestRuns: db.collection<IngestRun>(COLLECTIONS.ingestRuns),
});

export type Collections = ReturnType<typeof collections>;
