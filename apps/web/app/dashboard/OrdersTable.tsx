'use client';

import type { OrderJson, OrderSort, SortDir } from '@pulseboard/shared';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import { EMPTY, formatCentsExact, formatDay } from '../../lib/format.ts';

const ROW_PX = 36;
/** Fetch the next page while this many loaded rows are still below the view. */
const PREFETCH_ROWS = 40;

// One grid template for the header and every row, so columns line up
// without a <table> (absolutely positioned rows can't be table rows).
const COLUMNS = 'grid grid-cols-[13.5rem_6rem_9rem_minmax(10rem,1fr)_7rem_7rem] items-center';
const cell = 'truncate px-3';

interface Props {
  orders: OrderJson[];
  /** Orders across all pages, from the first page; null until known. */
  total: number | null;
  campaignNames: ReadonlyMap<string, string>;
  sort: OrderSort;
  dir: SortDir;
  onSort(sort: OrderSort): void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage(): void;
}

function SortHeader({
  label,
  column,
  sort,
  dir,
  onSort,
  align = 'left',
}: Pick<Props, 'sort' | 'dir' | 'onSort'> & {
  label: string;
  column: OrderSort;
  align?: 'left' | 'right';
}) {
  const active = sort === column;
  return (
    <div
      role="columnheader"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`${cell} ${align === 'right' ? 'text-right' : ''}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 rounded hover:text-ink ${active ? 'text-ink' : ''}`}
      >
        {label}
        <span aria-hidden className={active ? '' : 'invisible'}>
          {dir === 'asc' ? '↑' : '↓'}
        </span>
      </button>
    </div>
  );
}

/**
 * Every order matching the filters, virtualized: only the rows in view (plus
 * an overscan) are in the DOM, and the next keyset page loads before the
 * scroll reaches the end of what's loaded. ARIA table roles keep it a table
 * to assistive tech, with row indexes against the full total.
 */
export function OrdersTable(props: Props) {
  const { orders, total, campaignNames, hasNextPage, isFetchingNextPage, fetchNextPage } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: orders.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_PX,
    overscan: 12,
  });
  const items = virtualizer.getVirtualItems();
  const lastIndex = items.at(-1)?.index ?? 0;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && lastIndex >= orders.length - PREFETCH_ROWS)
      fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, lastIndex, orders.length, fetchNextPage]);

  // A new sort starts from the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [props.sort, props.dir]);

  return (
    <div ref={scroller} className="h-full overflow-auto">
      <div
        role="table"
        aria-label="Orders in the selected range"
        aria-rowcount={(total ?? orders.length) + 1}
        className="min-w-[840px] text-sm whitespace-nowrap"
      >
        <div role="rowgroup" className="sticky top-0 z-10 bg-raised">
          <div
            role="row"
            aria-rowindex={1}
            className={`${COLUMNS} h-9 border-b border-line text-xs font-medium text-muted`}
          >
            <div role="columnheader" className={cell}>
              Order
            </div>
            <SortHeader label="Date" column="date" {...props} />
            <div role="columnheader" className={cell}>
              Channel
            </div>
            <div role="columnheader" className={cell}>
              Campaign
            </div>
            <SortHeader label="Revenue" column="revenue" align="right" {...props} />
            <div role="columnheader" className={cell}>
              Customer
            </div>
          </div>
        </div>
        <div role="rowgroup" className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {items.map((item) => {
            const o = orders[item.index];
            const style = { height: ROW_PX, transform: `translateY(${item.start}px)` };
            const row = `${COLUMNS} absolute inset-x-0 top-0 border-b border-line`;
            if (!o)
              return (
                <div key="loading" role="row" className={`${row} text-muted`} style={style}>
                  <div role="cell" className={`${cell} col-span-6`}>
                    Loading more orders…
                  </div>
                </div>
              );
            return (
              <div
                key={o.orderId}
                role="row"
                aria-rowindex={item.index + 2}
                className={row}
                style={style}
              >
                <div role="rowheader" className={`${cell} font-mono text-xs`}>
                  {o.orderId}
                </div>
                <div role="cell" className={`${cell} text-ink-secondary`}>
                  {formatDay(o.date)}
                </div>
                <div role="cell" className={cell}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: CHANNEL_COLORS[o.channel] }}
                    />
                    {CHANNEL_LABELS[o.channel]}
                  </span>
                </div>
                <div role="cell" className={`${cell} text-ink-secondary`}>
                  {o.campaignId ? (campaignNames.get(o.campaignId) ?? o.campaignId) : EMPTY}
                </div>
                <div role="cell" className={`${cell} text-right tabular-nums`}>
                  {formatCentsExact(o.revenue)}
                </div>
                <div role="cell" className={`${cell} text-ink-secondary`}>
                  {o.isNewCustomer ? 'New' : 'Returning'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
