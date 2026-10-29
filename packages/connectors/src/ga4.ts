import { CHANNELS, datesInRange, type RawTraffic } from '@pulseboard/shared';
import type { Connector } from './index.ts';
import { seeded } from './random.ts';
import { sessionsFor } from './simulation.ts';

/** Simulated GA4: sessions and users per channel per day. */
export const ga4: Connector<RawTraffic> = {
  source: 'ga4',
  async fetch(range) {
    return datesInRange(range).flatMap((date) =>
      CHANNELS.map((channel): RawTraffic => {
        const sessions = sessionsFor(date, channel);
        const usersPerSession = seeded('ga4', date, channel).between(0.7, 0.85);
        return {
          source: 'ga4',
          date,
          channel,
          sessions,
          users: Math.round(sessions * usersPerSession),
        };
      }),
    );
  },
};
