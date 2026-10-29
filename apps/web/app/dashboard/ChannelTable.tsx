import type { RangeSummary, ReportChannel } from '@pulseboard/shared';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import {
  EMPTY,
  formatCents,
  formatCentsExact,
  formatCount,
  formatPercent,
  formatRatio,
} from '../../lib/format.ts';
import { TABLE_CHANNELS } from '../../lib/series.ts';

interface Props {
  summary: Partial<Record<ReportChannel, RangeSummary>>;
  selected: ReportChannel;
  onSelect(channel: ReportChannel): void;
}

const num = 'px-3 py-2.5 text-right tabular-nums';

/** Every channel's range KPIs; also the table view of the charts. */
export function ChannelTable({ summary, selected, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">KPIs by channel for the selected range</caption>
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-line">
            <th scope="col" className="px-3 py-2 font-medium">
              Channel
            </th>
            {['Revenue', 'Ad spend', 'ROAS', 'CAC', 'Conv. rate', 'Orders'].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-right font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_CHANNELS.map((channel) => {
            const s = summary[channel];
            const isTotal = channel === 'all';
            return (
              <tr
                key={channel}
                aria-selected={selected === channel}
                className={`border-b border-line last:border-0 aria-selected:bg-line ${isTotal ? 'font-semibold' : ''}`}
              >
                <th scope="row" className="px-3 py-1 text-left font-[inherit]">
                  <button
                    type="button"
                    onClick={() => onSelect(channel)}
                    className="inline-flex items-center gap-2 rounded px-0 py-1.5 hover:underline"
                  >
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ background: isTotal ? 'transparent' : CHANNEL_COLORS[channel] }}
                    />
                    {isTotal ? 'Total' : CHANNEL_LABELS[channel]}
                  </button>
                </th>
                <td className={num}>{s ? formatCents(s.revenue) : EMPTY}</td>
                <td className={num}>{s ? formatCents(s.spend) : EMPTY}</td>
                <td className={num}>{s ? formatRatio(s.roas) : EMPTY}</td>
                <td className={num}>{s ? formatCentsExact(s.cac) : EMPTY}</td>
                <td className={num}>{s ? formatPercent(s.conversionRate) : EMPTY}</td>
                <td className={num}>{s ? formatCount(s.orders) : EMPTY}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
