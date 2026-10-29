import { CHANNELS, datesInRange, type RawOrder } from '@pulseboard/shared';
import type { Connector } from './index.ts';
import { seeded } from './random.ts';
import { AVERAGE_ORDER_CENTS, PROFILES, sessionsFor } from './simulation.ts';

/**
 * Simulated Shopify: individual orders, attributed to a channel. Order ids
 * are derived from (date, channel, n), so re-fetching a day yields the same ids.
 */
export const shopify: Connector<RawOrder> = {
  source: 'shopify',
  async fetch(range) {
    return datesInRange(range).flatMap((date) =>
      CHANNELS.flatMap((channel) => {
        const profile = PROFILES[channel];
        const rand = seeded('shopify', date, channel);
        const count = Math.round(
          sessionsFor(date, channel) * profile.conversionRate * rand.between(0.85, 1.15),
        );

        return Array.from({ length: count }, (_, n): RawOrder => ({
          source: 'shopify',
          orderId: `${date}-${channel}-${n + 1}`,
          date,
          channel,
          revenue: Math.round(AVERAGE_ORDER_CENTS * rand.between(0.5, 1.5)),
          isNewCustomer: rand.next() < profile.newCustomerShare,
        }));
      }),
    );
  },
};
