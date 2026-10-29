import type { TooltipContentProps } from 'recharts';
import { formatCentsExact, formatDay } from '../../lib/format.ts';

/** Shared tooltip: the day, then one row per series with its color key. */
export function ChartTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-ink">{formatDay(String(label))}</p>
      <ul className="space-y-0.5">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined)
          .map((p) => (
            <li key={String(p.dataKey)} className="flex items-center gap-2 text-ink-secondary">
              <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
              <span className="flex-1">{p.name}</span>
              <span className="tabular-nums text-ink">{formatCentsExact(Number(p.value))}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

export const axisProps = {
  stroke: 'var(--axis)',
  tick: { fill: 'var(--ink-muted)', fontSize: 12 },
  tickLine: false,
} as const;
