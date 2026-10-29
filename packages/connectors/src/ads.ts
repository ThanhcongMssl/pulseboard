import type { Channel, RawAdSpend, Source } from '@pulseboard/shared';
import { datesInRange } from '@pulseboard/shared';
import type { Connector } from './index.ts';
import { seeded } from './random.ts';
import { PROFILES, sessionsFor } from './simulation.ts';

const CAMPAIGNS_PER_PLATFORM = 3;

/**
 * A simulated ad platform: the channel's spend for the day, split across a
 * few campaigns, with impressions and clicks derived from it.
 */
function adPlatform(
  source: Source,
  channel: Channel,
  campaignPrefix: string,
): Connector<RawAdSpend> {
  return {
    source,
    async fetch(range) {
      return datesInRange(range).flatMap((date) => {
        const total = sessionsFor(date, channel) * PROFILES[channel].costPerSession;
        const rand = seeded(source, date);
        const weights = Array.from({ length: CAMPAIGNS_PER_PLATFORM }, () =>
          rand.between(0.5, 1.5),
        );
        const weightSum = weights.reduce((a, b) => a + b, 0);

        return weights.map((weight, i): RawAdSpend => {
          const spend = Math.round((total * weight) / weightSum);
          // CPM of roughly $6–10 and a CTR of 1–2.5%.
          const impressions = Math.round((spend / rand.between(600, 1_000)) * 1_000);
          const clicks = Math.round(impressions * rand.between(0.01, 0.025));
          return {
            source,
            date,
            channel,
            campaignId: `${campaignPrefix}_${i + 1}`,
            spend,
            impressions,
            clicks,
          };
        });
      });
    },
  };
}

export const facebookAds = adPlatform('facebook_ads', 'paid_social', 'fb');
export const googleAds = adPlatform('google_ads', 'paid_search', 'gads');
