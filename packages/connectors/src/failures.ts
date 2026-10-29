import type { Connector } from './index.ts';

/**
 * Make a connector fail a share of its fetches, to demo retries and stale
 * sources. Unlike the data itself this is deliberately not seeded: a retry
 * of the same day should get a fresh chance to succeed.
 */
export function withFailureRate<T>(
  connector: Connector<T>,
  rate: number,
  random: () => number = Math.random,
): Connector<T> {
  if (rate <= 0) return connector;
  return {
    source: connector.source,
    async fetch(range) {
      if (random() < rate) throw new Error(`${connector.source}: simulated upstream failure`);
      return connector.fetch(range);
    },
  };
}
