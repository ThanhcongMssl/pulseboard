import type { CampaignSummary } from '@pulseboard/shared';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import {
  formatCents,
  formatCentsExact,
  formatCount,
  formatPercent,
  formatRatio,
} from '../../lib/format.ts';

const num = 'px-3 py-2.5 text-right tabular-nums';
const HEADERS = ['Spend', 'Revenue', 'ROAS', 'CAC', 'CTR', 'Orders'];

interface Props {
  campaigns: CampaignSummary[];
  selected: string | null;
  onSelect(campaign: CampaignSummary): void;
}

/** Range totals per ad campaign, largest spend first (the API's order). */
export function CampaignTable({ campaigns, selected, onSelect }: Props) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[720px] text-sm whitespace-nowrap">
        <caption className="sr-only">Ad campaigns for the selected range</caption>
        <thead className="sticky top-0 bg-raised text-left text-xs text-muted">
          <tr className="border-b border-line">
            <th scope="col" className="px-3 py-2 font-medium">
              Campaign
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Channel
            </th>
            {HEADERS.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-right font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr
              key={c.campaignId}
              aria-selected={selected === c.campaignId}
              className="border-b border-line last:border-0 aria-selected:bg-line"
            >
              <th scope="row" className="px-3 py-1 text-left font-medium">
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className="rounded py-1.5 text-left hover:underline"
                >
                  {c.campaignName}
                </button>
              </th>
              <td className="px-3 py-2.5 text-ink-secondary">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ background: CHANNEL_COLORS[c.channel] }}
                  />
                  {CHANNEL_LABELS[c.channel]}
                </span>
              </td>
              <td className={num}>{formatCents(c.spend)}</td>
              <td className={num}>{formatCents(c.revenue)}</td>
              <td className={num}>{formatRatio(c.roas)}</td>
              <td className={num}>{formatCentsExact(c.cac)}</td>
              <td className={num}>{formatPercent(c.ctr)}</td>
              <td className={num}>{formatCount(c.orders)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
