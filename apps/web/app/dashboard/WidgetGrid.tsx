'use client';

import { GRID_COLUMNS, type LayoutItem } from '@pulseboard/shared';
import { useMemo } from 'react';
import ReactGridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { isKpi } from '../../lib/kpis.ts';
import { fromGrid, readingOrder, removeWidget, toGrid, WIDGETS } from '../../lib/widgets.ts';
import { DRAG_HANDLE, WidgetChromeContext } from './Panel.tsx';
import { Widget } from './Widgets.tsx';

const ROW_HEIGHT = 32;
const GAP = 16;
/** Below this width the grid becomes a single column you can't rearrange. */
const STACK_BELOW = 768;

/** A widget's height in pixels for `h` grid rows, gaps included. */
const rowsToPx = (h: number) => h * ROW_HEIGHT + (h - 1) * GAP;

interface Props {
  items: LayoutItem[];
  editing: boolean;
  /** A finished drag, resize or removal: one undoable step. */
  onCommit(items: LayoutItem[]): void;
}

export function WidgetGrid({ items, editing, onCommit }: Props) {
  const { width, containerRef, mounted } = useContainerWidth();
  const layout = useMemo(() => toGrid(items), [items]);
  const stacked = mounted && width < STACK_BELOW;

  // Commit on drop rather than on every intermediate layout, so a drag is one undo step.
  const commit = (grid: Layout) => onCommit(fromGrid(items, grid));

  const cell = (item: LayoutItem) => (
    <WidgetChromeContext
      value={
        editing && !stacked
          ? {
              title: WIDGETS[item.kind].title,
              onRemove: () => onCommit(removeWidget(items, item.id)),
            }
          : null
      }
    >
      <Widget kind={item.kind} />
    </WidgetChromeContext>
  );

  return (
    <div ref={containerRef}>
      {!mounted ? null : stacked ? (
        // Phones: reading order, KPI tiles two abreast, everything else full width.
        <div className="grid grid-cols-2 gap-3">
          {readingOrder(items).map((item) => (
            <div
              key={item.id}
              className={isKpi(item.kind) ? '' : 'col-span-2'}
              style={{ height: rowsToPx(WIDGETS[item.kind].h) }}
            >
              {cell(item)}
            </div>
          ))}
        </div>
      ) : (
        <ReactGridLayout
          width={width}
          layout={layout}
          gridConfig={{
            cols: GRID_COLUMNS,
            rowHeight: ROW_HEIGHT,
            margin: [GAP, GAP],
            containerPadding: [0, 0],
          }}
          dragConfig={{ enabled: editing, handle: `.${DRAG_HANDLE}`, cancel: 'button' }}
          resizeConfig={{ enabled: editing, handles: ['se'] }}
          onDragStop={commit}
          onResizeStop={commit}
          className={editing ? 'is-editing' : ''}
        >
          {items.map((item) => (
            <div key={item.id}>{cell(item)}</div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
