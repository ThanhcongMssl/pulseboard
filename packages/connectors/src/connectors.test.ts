import { describe, expect, it } from 'vitest';
import {
  datesInRange,
  rawAdSpendSchema,
  rawOrderSchema,
  rawTargetSchema,
  rawTrafficSchema,
  roas,
  SOURCES,
  type DateRange,
  type Source,
} from '@pulseboard/shared';
import { connectors, withFailureRate } from './index.ts';

const range: DateRange = { from: '2026-09-28', to: '2026-10-04' };

// The natural key of each source's records, as documented in models.ts.
const keyFields: Record<Source, string[]> = {
  facebook_ads: ['source', 'date', 'campaignId'],
  google_ads: ['source', 'date', 'campaignId'],
  ga4: ['source', 'date', 'channel'],
  shopify: ['source', 'orderId'],
  sheets_targets: ['month', 'channel'],
};

const schemas = {
  facebook_ads: rawAdSpendSchema,
  google_ads: rawAdSpendSchema,
  ga4: rawTrafficSchema,
  shopify: rawOrderSchema,
  sheets_targets: rawTargetSchema,
};

describe.each(SOURCES)('%s connector', (source) => {
  const connector = connectors[source];

  it('returns the same records for the same range', async () => {
    expect(await connector.fetch(range)).toEqual(await connector.fetch(range));
  });

  it('returns records that pass the raw schema', async () => {
    const records = await connector.fetch(range);
    expect(records.length).toBeGreaterThan(0);
    expect(() => schemas[source].array().parse(records)).not.toThrow();
  });

  it('never repeats a natural key', async () => {
    const records: Record<string, unknown>[] = await connector.fetch(range);
    const keys = records.map((r) => keyFields[source].map((f) => r[f]).join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('returns the same data for a day whether fetched alone or in a range', async () => {
    const days = await Promise.all(
      datesInRange(range).map((d) => connector.fetch({ from: d, to: d })),
    );
    const all = await connector.fetch(range);
    // Targets are monthly, so a single day fetches its whole month: compare as sets.
    expect(new Set(days.flat().map((r) => JSON.stringify(r)))).toEqual(
      new Set(all.map((r) => JSON.stringify(r))),
    );
  });
});

describe('simulated market', () => {
  it('produces ad spend for both paid channels only', async () => {
    const fb = await connectors.facebook_ads.fetch(range);
    const gads = await connectors.google_ads.fetch(range);
    expect(new Set(fb.map((r) => r.channel))).toEqual(new Set(['paid_social']));
    expect(new Set(gads.map((r) => r.channel))).toEqual(new Set(['paid_search']));
  });

  it('yields a plausible ROAS for paid channels', async () => {
    const spend = (await connectors.google_ads.fetch(range)).reduce((s, r) => s + r.spend, 0);
    const revenue = (await connectors.shopify.fetch(range))
      .filter((o) => o.channel === 'paid_search')
      .reduce((s, o) => s + o.revenue, 0);
    expect(roas(revenue, spend)).toBeGreaterThan(1.5);
    expect(roas(revenue, spend)).toBeLessThan(6);
  });
});

describe('withFailureRate', () => {
  it('passes through when the rate is 0', () => {
    expect(withFailureRate(connectors.ga4, 0)).toBe(connectors.ga4);
  });

  it('throws when the random draw is under the rate', async () => {
    const flaky = withFailureRate(connectors.ga4, 0.5, () => 0.1);
    await expect(flaky.fetch(range)).rejects.toThrow(/simulated upstream failure/);
  });

  it('fetches normally when the draw is over the rate', async () => {
    const flaky = withFailureRate(connectors.ga4, 0.5, () => 0.9);
    expect(await flaky.fetch(range)).toEqual(await connectors.ga4.fetch(range));
  });
});
