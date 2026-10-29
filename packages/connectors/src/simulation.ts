import { weekdayOf, type Channel, type IsoDate } from '@pulseboard/shared';
import { seeded } from './random.ts';

// The shared "market" behind every simulated source. Each connector derives
// its numbers from the same per-day, per-channel demand, so spend, traffic and
// orders move together and the KPIs built from them look plausible
// (ROAS around 2–4, conversion rates of 1.5–4%).

interface ChannelProfile {
  /** Typical weekday sessions. */
  sessions: number;
  /** Ad spend per session, in cents; 0 for unpaid channels. */
  costPerSession: number;
  conversionRate: number;
  /** Share of orders placed by first-time customers. */
  newCustomerShare: number;
  /** Traffic multiplier on Saturdays and Sundays. */
  weekend: number;
}

export const PROFILES: Record<Channel, ChannelProfile> = {
  paid_social: {
    sessions: 4_000,
    costPerSession: 35,
    conversionRate: 0.015,
    newCustomerShare: 0.6,
    weekend: 0.85,
  },
  paid_search: {
    sessions: 3_000,
    costPerSession: 60,
    conversionRate: 0.03,
    newCustomerShare: 0.55,
    weekend: 0.85,
  },
  organic: {
    sessions: 5_000,
    costPerSession: 0,
    conversionRate: 0.02,
    newCustomerShare: 0.4,
    weekend: 1.1,
  },
  email: {
    sessions: 1_500,
    costPerSession: 0,
    conversionRate: 0.04,
    newCustomerShare: 0.15,
    weekend: 0.7,
  },
  direct: {
    sessions: 2_000,
    costPerSession: 0,
    conversionRate: 0.035,
    newCustomerShare: 0.3,
    weekend: 1,
  },
};

/** Average order value in cents. */
export const AVERAGE_ORDER_CENTS = 6_500;

const TREND_START = Date.parse('2026-01-01T00:00:00Z');

/** Multiplier on a channel's baseline for one day: weekday pattern × slow growth × noise. */
export function demand(date: IsoDate, channel: Channel): number {
  const day = weekdayOf(date);
  const weekend = day === 0 || day === 6 ? PROFILES[channel].weekend : 1;
  const daysSinceStart = (Date.parse(`${date}T00:00:00Z`) - TREND_START) / 86_400_000;
  const trend = Math.max(0.5, 1 + 0.001 * daysSinceStart);
  const noise = seeded('demand', date, channel).between(0.85, 1.15);
  return weekend * trend * noise;
}

/** Sessions GA4 reports for a channel on a day; shopify sizes its orders from the same number. */
export const sessionsFor = (date: IsoDate, channel: Channel) =>
  Math.round(PROFILES[channel].sessions * demand(date, channel));
