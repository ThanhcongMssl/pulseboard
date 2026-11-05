import type { Db } from 'mongodb';
import type {
  IngestRun,
  RawAdSpend,
  RawOrder,
  RawTarget,
  RawTraffic,
  ReportCampaignDaily,
  ReportDaily,
} from '@pulseboard/shared';

export const COLLECTIONS = {
  rawAdSpend: 'raw_ad_spend',
  rawTraffic: 'raw_traffic',
  rawOrders: 'raw_orders',
  rawTargets: 'raw_targets',
  reportsDaily: 'reports_daily',
  reportsCampaignDaily: 'reports_campaign_daily',
  ingestRuns: 'ingest_runs',
} as const;

/** Typed handles to every collection, so callers never pass names as strings. */
export const collections = (db: Db) => ({
  rawAdSpend: db.collection<RawAdSpend>(COLLECTIONS.rawAdSpend),
  rawTraffic: db.collection<RawTraffic>(COLLECTIONS.rawTraffic),
  rawOrders: db.collection<RawOrder>(COLLECTIONS.rawOrders),
  rawTargets: db.collection<RawTarget>(COLLECTIONS.rawTargets),
  reportsDaily: db.collection<ReportDaily>(COLLECTIONS.reportsDaily),
  reportsCampaignDaily: db.collection<ReportCampaignDaily>(COLLECTIONS.reportsCampaignDaily),
  ingestRuns: db.collection<IngestRun>(COLLECTIONS.ingestRuns),
});

export type Collections = ReturnType<typeof collections>;
