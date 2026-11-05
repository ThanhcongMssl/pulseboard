/**
 * The version of the pipeline that built a report. Every reports_daily row is
 * stamped with it, and a worker started with SEED_DAYS rebuilds any day in its
 * window built by an older version.
 *
 * Bump it in any change that makes existing history wrong (attribution, KPI
 * math, a new read model): the next deploy then re-seeds the hosted demo.
 *
 * 1: orders carry their campaign, and campaign reports exist.
 */
export const DATA_VERSION = 1;
