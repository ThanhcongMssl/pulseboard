import { CHANNELS, datesInRange, type RawOrder } from '@pulseboard/shared';
import { AD_SOURCE, CAMPAIGNS, orderShares } from './ads.ts';
import type { Connector } from './index.ts';
import { seeded } from './random.ts';
import { AVERAGE_ORDER_CENTS, PROFILES, sessionsFor } from './simulation.ts';

/** Index of the bucket a [0, 1) draw lands in, given shares summing to 1. */
export function pick(shares: readonly number[], draw: number): number {
  let edge = 0;
  for (let i = 0; i < shares.length; i++) {
    edge += shares[i]!;
    if (draw < edge) return i;
  }
  return shares.length - 1; // float rounding left the sum a hair under 1
}

/**
 * Simulated Shopify: individual orders, attributed to a channel and, for paid
 * channels, to one of the ad platform's campaigns. Order ids are derived from
 * (date, channel, n), so re-fetching a day yields the same ids.
 */
export const shopify: Connector<RawOrder> = {
  source: 'shopify',
  async fetch(range) {
    return datesInRange(range).flatMap((date) =>
      CHANNELS.flatMap((channel) => {
        const profile = PROFILES[channel];
        const rand = seeded('shopify', date, channel);
        // A separate stream, so attribution doesn't shift the other fields.
        const attribution = seeded('shopify-attribution', date, channel);
        const adSource = AD_SOURCE[channel];
        const shares = adSource ? orderShares(adSource, date) : null;
        const count = Math.round(
          sessionsFor(date, channel) * profile.conversionRate * rand.between(0.85, 1.15),
        );

        return Array.from({ length: count }, (_, n): RawOrder => ({
          source: 'shopify',
          orderId: `${date}-${channel}-${n + 1}`,
          date,
          channel,
          campaignId:
            adSource && shares ? CAMPAIGNS[adSource][pick(shares, attribution.next())]!.id : null,
          revenue: Math.round(AVERAGE_ORDER_CENTS * rand.between(0.5, 1.5)),
          isNewCustomer: rand.next() < profile.newCustomerShare,
        }));
      }),
    );
  },
};
