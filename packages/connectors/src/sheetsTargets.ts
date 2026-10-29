import { CHANNELS, datesInRange, daysInMonth, monthOf, type RawTarget } from '@pulseboard/shared';
import type { Connector } from './index.ts';
import { seeded } from './random.ts';
import { AVERAGE_ORDER_CENTS, PROFILES } from './simulation.ts';

/** Round cents to whole $100, as a planner typing into a sheet would. */
const roundToHundredDollars = (cents: number) => Math.round(cents / 10_000) * 10_000;

/**
 * Simulated Google Sheet of monthly targets, one row per month and channel.
 * Targets sit a little above baseline so some days beat them and some miss.
 */
export const sheetsTargets: Connector<RawTarget> = {
  source: 'sheets_targets',
  async fetch(range) {
    const months = [...new Set(datesInRange(range).map(monthOf))];
    return months.flatMap((month) =>
      CHANNELS.map((channel): RawTarget => {
        const profile = PROFILES[channel];
        const days = daysInMonth(month);
        const stretch = seeded('sheets_targets', month, channel).between(1.05, 1.2);
        const dailyRevenue = profile.sessions * profile.conversionRate * AVERAGE_ORDER_CENTS;
        return {
          month,
          channel,
          revenueTarget: roundToHundredDollars(dailyRevenue * days * stretch),
          spendBudget: roundToHundredDollars(profile.sessions * profile.costPerSession * days),
        };
      }),
    );
  },
};
