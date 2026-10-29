import type {
  DateRange,
  RawAdSpend,
  RawOrder,
  RawTarget,
  RawTraffic,
  Source,
} from '@pulseboard/shared';
import { facebookAds, googleAds } from './ads.ts';
import { ga4 } from './ga4.ts';
import { sheetsTargets } from './sheetsTargets.ts';
import { shopify } from './shopify.ts';

export type { DateRange };

/**
 * A data source the ingest jobs pull from. The demo ships simulated
 * connectors with deterministic seed data; a real Facebook Ads, GA4 or
 * Shopify client implements this same interface.
 *
 * Implementations must return the same records for the same range, keyed so
 * the ingest upsert can match them; that is what makes re-ingesting a day safe.
 */
export interface Connector<TRecord> {
  readonly source: Source;
  fetch(range: DateRange): Promise<TRecord[]>;
}

/** The record type each source produces. */
export interface SourceRecords {
  facebook_ads: RawAdSpend;
  google_ads: RawAdSpend;
  ga4: RawTraffic;
  shopify: RawOrder;
  sheets_targets: RawTarget;
}

/** One simulated connector per source. */
export const connectors: { [S in Source]: Connector<SourceRecords[S]> } = {
  facebook_ads: facebookAds,
  google_ads: googleAds,
  ga4,
  shopify,
  sheets_targets: sheetsTargets,
};

export { withFailureRate } from './failures.ts';
