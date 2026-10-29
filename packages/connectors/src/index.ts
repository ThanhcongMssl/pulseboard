import type { IsoDate, Source } from '@pulseboard/shared';

/** Inclusive range of UTC calendar days. */
export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

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
