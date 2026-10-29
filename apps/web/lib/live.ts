import type { ReportsUpdatedEvent } from '@pulseboard/shared';

/** Whether a rebuild touched any day the dashboard is showing. */
export const affectsView = (
  event: Pick<ReportsUpdatedEvent, 'dates'>,
  { from, to }: { from: string; to: string },
) => event.dates.some((date) => date >= from && date <= to);

/** Reconnect delay: 1s, 2s, 4s, … capped at 30s. */
export const backoffMs = (attempt: number) => Math.min(30_000, 1_000 * 2 ** attempt);
