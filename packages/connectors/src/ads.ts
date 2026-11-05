import type { Channel, IsoDate, RawAdSpend } from '@pulseboard/shared';
import { datesInRange } from '@pulseboard/shared';
import type { Connector } from './index.ts';
import { seeded, type Random } from './random.ts';
import { PROFILES, sessionsFor } from './simulation.ts';

export type AdSource = 'facebook_ads' | 'google_ads';

interface Campaign {
  id: string;
  name: string;
  /** Orders per dollar relative to the platform's average, so campaigns differ in ROAS. */
  efficiency: number;
}

/** The simulated campaigns of each ad platform. */
export const CAMPAIGNS: Record<AdSource, readonly Campaign[]> = {
  facebook_ads: [
    { id: 'fb_1', name: 'Prospecting · Lookalike', efficiency: 0.8 },
    { id: 'fb_2', name: 'Retargeting · Site visitors', efficiency: 1.6 },
    { id: 'fb_3', name: 'Awareness · Video', efficiency: 0.5 },
  ],
  google_ads: [
    { id: 'gads_1', name: 'Brand search', efficiency: 1.8 },
    { id: 'gads_2', name: 'Generic search', efficiency: 0.8 },
    { id: 'gads_3', name: 'Shopping', efficiency: 1.1 },
  ],
};

/** The ad platform behind each paid channel. */
export const AD_SOURCE: Partial<Record<Channel, AdSource>> = {
  paid_social: 'facebook_ads',
  paid_search: 'google_ads',
};

const normalize = (weights: number[]) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
};

// The first draws of the platform's daily stream, so spendShares and the
// connector agree without the connector exporting its internals.
const drawWeights = (source: AdSource, rand: Random) =>
  CAMPAIGNS[source].map(() => rand.between(0.5, 1.5));

/** Each campaign's share of the platform's spend on a day. */
export const spendShares = (source: AdSource, date: IsoDate) =>
  normalize(drawWeights(source, seeded(source, date)));

/**
 * Each campaign's share of the channel's orders on a day: its spend share
 * weighted by its efficiency. Shopify attributes orders with these.
 */
export const orderShares = (source: AdSource, date: IsoDate) => {
  const spend = spendShares(source, date);
  return normalize(CAMPAIGNS[source].map((c, i) => spend[i]! * c.efficiency));
};

/**
 * A simulated ad platform: the channel's spend for the day, split across its
 * campaigns, with impressions and clicks derived from it.
 */
function adPlatform(source: AdSource, channel: Channel): Connector<RawAdSpend> {
  return {
    source,
    async fetch(range) {
      return datesInRange(range).flatMap((date) => {
        const total = sessionsFor(date, channel) * PROFILES[channel].costPerSession;
        const rand = seeded(source, date);
        const shares = normalize(drawWeights(source, rand));

        return CAMPAIGNS[source].map((campaign, i): RawAdSpend => {
          const spend = Math.round(total * shares[i]!);
          // CPM of roughly $6–10 and a CTR of 1–2.5%.
          const impressions = Math.round((spend / rand.between(600, 1_000)) * 1_000);
          const clicks = Math.round(impressions * rand.between(0.01, 0.025));
          return {
            source,
            date,
            channel,
            campaignId: campaign.id,
            campaignName: campaign.name,
            spend,
            impressions,
            clicks,
          };
        });
      });
    },
  };
}

export const facebookAds = adPlatform('facebook_ads', 'paid_social');
export const googleAds = adPlatform('google_ads', 'paid_search');
