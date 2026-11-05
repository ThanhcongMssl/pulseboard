import {
  addDays,
  datesInRange,
  type DateRange,
  type RangeSummary,
  type ReportChannel,
  type ReportDailyJson,
} from '@pulseboard/shared';
import { formatPercent } from './format.ts';
import type { KpiKind } from './kpis.ts';
import type { DailyPoint } from './series.ts';

// "Compare with the previous period": the range before the one on screen, and
// how each KPI moved against it. Pure, so the edge cases are tested here.

/** The range of the same length that ends the day before `range` starts. */
export function previousRange({ from, to }: DateRange): DateRange {
  const days = datesInRange({ from, to }).length;
  return { from: addDays(from, -days), to: addDays(from, -1) };
}

/**
 * Whether `channel` has a report for every day of `range`. A partial period
 * (history that starts mid-range) would make every delta look like growth.
 */
export function coversRange(
  reports: readonly ReportDailyJson[],
  channel: ReportChannel,
  range: DateRange,
): boolean {
  const days = new Set(reports.filter((r) => r.channel === channel).map((r) => r.date));
  return datesInRange(range).every((d) => days.has(d));
}

type Better = 'up' | 'down' | null;

/** Which summary field each tile shows, and which way is good news (null: neither). */
const METRICS: Record<KpiKind, { field: keyof RangeSummary; better: Better }> = {
  'kpi.revenue': { field: 'revenue', better: 'up' },
  'kpi.spend': { field: 'spend', better: null },
  'kpi.roas': { field: 'roas', better: 'up' },
  'kpi.cac': { field: 'cac', better: 'down' },
  'kpi.conversionRate': { field: 'conversionRate', better: 'up' },
  'kpi.orders': { field: 'orders', better: 'up' },
};

export interface Delta {
  /** Relative change, e.g. 0.042 = 4.2% up. */
  change: number;
  direction: 'up' | 'down' | 'flat';
  tone: 'good' | 'bad' | 'neutral';
}

/** Changes smaller than this round to 0.0% and show as flat. */
const FLAT = 0.0005;

/**
 * How a KPI moved since the previous period, or null when it can't be said:
 * no previous period, or a ratio that was undefined (or zero) in either one.
 * Ratios compare the range ratios, which come from totals, never from averages.
 */
export function kpiDelta(
  kind: KpiKind,
  current: RangeSummary | undefined,
  previous: RangeSummary | undefined,
): Delta | null {
  const { field, better } = METRICS[kind];
  const now = current?.[field];
  const before = previous?.[field];
  if (now === null || now === undefined || !before) return null;
  const change = now / before - 1;
  const direction = Math.abs(change) < FLAT ? 'flat' : change > 0 ? 'up' : 'down';
  const tone =
    better === null || direction === 'flat' ? 'neutral' : direction === better ? 'good' : 'bad';
  return { change, direction, tone };
}

const ARROWS = { up: '▲', down: '▼', flat: '■' } as const;

/** "▲ 4.2%" for the tile, and a sentence for screen readers. */
export function describeDelta(delta: Delta): { short: string; long: string } {
  const pct = formatPercent(Math.abs(delta.change), 1);
  return {
    short: `${ARROWS[delta.direction]} ${pct}`,
    long:
      delta.direction === 'flat'
        ? 'Unchanged from the previous period'
        : `${delta.direction === 'up' ? 'Up' : 'Down'} ${pct} from the previous period`,
  };
}

export type ComparedPoint = DailyPoint & { previousRevenue: number | null };

/** Each day with the revenue of the same day of the previous period, matched by position. */
export const withPrevious = (
  points: readonly DailyPoint[],
  previous: readonly DailyPoint[],
): ComparedPoint[] =>
  points.map((p, i) => ({ ...p, previousRevenue: previous[i]?.revenue ?? null }));
