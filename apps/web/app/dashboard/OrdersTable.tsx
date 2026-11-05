import type { OrderJson } from '@pulseboard/shared';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import { EMPTY, formatCentsExact, formatDay } from '../../lib/format.ts';

const cell = 'px-3 py-2';

/** A page of orders, newest first. Campaigns show by name once their names have loaded. */
export function OrdersTable({
  orders,
  campaignNames,
}: {
  orders: OrderJson[];
  campaignNames: ReadonlyMap<string, string>;
}) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[640px] text-sm whitespace-nowrap">
        <caption className="sr-only">Latest orders in the selected range</caption>
        <thead className="sticky top-0 bg-raised text-left text-xs text-muted">
          <tr className="border-b border-line">
            {['Order', 'Date', 'Channel', 'Campaign'].map((h) => (
              <th key={h} scope="col" className={`${cell} font-medium`}>
                {h}
              </th>
            ))}
            <th scope="col" className={`${cell} text-right font-medium`}>
              Revenue
            </th>
            <th scope="col" className={`${cell} font-medium`}>
              Customer
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.orderId} className="border-b border-line last:border-0">
              <th scope="row" className={`${cell} text-left font-mono text-xs font-normal`}>
                {o.orderId}
              </th>
              <td className={`${cell} text-ink-secondary`}>{formatDay(o.date)}</td>
              <td className={cell}>
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ background: CHANNEL_COLORS[o.channel] }}
                  />
                  {CHANNEL_LABELS[o.channel]}
                </span>
              </td>
              <td className={`${cell} text-ink-secondary`}>
                {o.campaignId ? (campaignNames.get(o.campaignId) ?? o.campaignId) : EMPTY}
              </td>
              <td className={`${cell} text-right tabular-nums`}>{formatCentsExact(o.revenue)}</td>
              <td className={`${cell} text-ink-secondary`}>
                {o.isNewCustomer ? 'New' : 'Returning'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
