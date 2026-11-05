import { dashboardLayoutSchema, WIDGET_KINDS, type LayoutItem } from '@pulseboard/shared';
import { describe, expect, it } from 'vitest';
import {
  addWidget,
  DEFAULT_LAYOUT,
  describePlacement,
  fromGrid,
  moveWidget,
  readingOrder,
  removeWidget,
  resizeWidget,
  sameLayout,
  toGrid,
  WIDGETS,
} from './widgets.ts';

describe('widget library', () => {
  it('describes every widget kind with a default size of at least its minimum', () => {
    for (const kind of WIDGET_KINDS) {
      const spec = WIDGETS[kind];
      expect(spec.w).toBeGreaterThanOrEqual(spec.minW);
      expect(spec.h).toBeGreaterThanOrEqual(spec.minH);
    }
  });

  it('has a default layout the API accepts, without overlaps', () => {
    expect(dashboardLayoutSchema.safeParse({ items: DEFAULT_LAYOUT }).success).toBe(true);
    const cells = new Set<string>();
    for (const item of DEFAULT_LAYOUT)
      for (let x = item.x; x < item.x + item.w; x++)
        for (let y = item.y; y < item.y + item.h; y++) {
          expect(cells.has(`${x},${y}`)).toBe(false);
          cells.add(`${x},${y}`);
        }
  });
});

describe('addWidget / removeWidget', () => {
  it('adds a widget at full width-default size below everything', () => {
    const items = addWidget(DEFAULT_LAYOUT, 'table.orders');
    expect(items.at(-1)).toEqual({
      id: 'table.orders',
      kind: 'table.orders',
      x: 0,
      y: 31,
      w: 12,
      h: 10,
    });
  });

  it('adds to an empty dashboard at the top', () => {
    expect(addWidget([], 'kpi.roas')).toEqual([
      { id: 'kpi.roas', kind: 'kpi.roas', x: 0, y: 0, w: 2, h: 4 },
    ]);
  });

  it('places each kind once', () => {
    expect(addWidget(DEFAULT_LAYOUT, 'kpi.revenue')).toEqual(DEFAULT_LAYOUT);
  });

  it('removes by id', () => {
    const items = removeWidget(DEFAULT_LAYOUT, 'chart.channelMix');
    expect(items).toHaveLength(DEFAULT_LAYOUT.length - 1);
    expect(items.some((i) => i.id === 'chart.channelMix')).toBe(false);
  });
});

describe('toGrid / fromGrid', () => {
  it('round-trips geometry and carries minimum sizes to the grid', () => {
    const grid = toGrid(DEFAULT_LAYOUT);
    expect(grid[0]).toEqual({ i: 'kpi.revenue', x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 });
    expect(fromGrid(DEFAULT_LAYOUT, grid)).toEqual(DEFAULT_LAYOUT);
  });

  it('takes moved geometry and keeps widgets the grid left out', () => {
    const moved = fromGrid(DEFAULT_LAYOUT, [{ i: 'chart.revenue', x: 6, y: 20, w: 6, h: 9 }]);
    expect(moved.find((i) => i.id === 'chart.revenue')).toMatchObject({ x: 6, y: 20 });
    expect(moved.find((i) => i.id === 'kpi.revenue')).toEqual(DEFAULT_LAYOUT[0]);
  });

  it('clamps geometry to the grid', () => {
    const [item] = fromGrid(DEFAULT_LAYOUT.slice(0, 1), [
      { i: 'kpi.revenue', x: 11, y: -2, w: 20, h: 3 },
    ]);
    expect(item).toMatchObject({ x: 0, y: 0, w: 12 });
  });
});

describe('sameLayout', () => {
  it('ignores item order but not geometry', () => {
    expect(sameLayout(DEFAULT_LAYOUT, [...DEFAULT_LAYOUT].reverse())).toBe(true);
    const moved = fromGrid(DEFAULT_LAYOUT, [{ i: 'kpi.spend', x: 2, y: 1, w: 2, h: 4 }]);
    expect(sameLayout(DEFAULT_LAYOUT, moved)).toBe(false);
    expect(sameLayout(DEFAULT_LAYOUT, DEFAULT_LAYOUT.slice(1))).toBe(false);
  });
});

describe('readingOrder', () => {
  it('sorts by row, then column', () => {
    const order = readingOrder([...DEFAULT_LAYOUT].reverse()).map((i) => i.id);
    expect(order.slice(0, 2)).toEqual(['kpi.revenue', 'kpi.spend']);
    expect(order.at(-1)).toBe('table.campaigns');
  });
});

describe('keyboard moves and resizes', () => {
  const at = (items: LayoutItem[], id: string) => items.find((i) => i.id === id)!;
  const overlaps = (items: LayoutItem[]) =>
    items.some((a, i) =>
      items.some(
        (b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h,
      ),
    );

  it('moves one column sideways, pushing what it lands on out of the way', () => {
    const items = moveWidget(DEFAULT_LAYOUT, 'chart.channelMix', 'left');
    expect(at(items, 'chart.channelMix')).toMatchObject({ x: 5, y: 4 });
    expect(overlaps(items)).toBe(false);
  });

  it('swaps places with the widget above or below when it can', () => {
    const up = moveWidget(DEFAULT_LAYOUT, 'table.campaigns', 'up');
    expect(at(up, 'table.campaigns').y).toBe(13);
    expect(at(up, 'table.channels').y).toBe(22);
    const down = moveWidget(DEFAULT_LAYOUT, 'table.channels', 'down');
    expect(at(down, 'table.channels').y).toBe(22);
    expect(overlaps(down)).toBe(false);
  });

  it('moves past a wider widget below, leaving what the grid holds in place', () => {
    const items = moveWidget(DEFAULT_LAYOUT, 'chart.revenue', 'down');
    // The full-width table stays under the mix chart; the revenue chart goes below it.
    expect(at(items, 'table.channels').y).toBe(13);
    expect(at(items, 'chart.revenue').y).toBe(22);
    expect(overlaps(items)).toBe(false);
  });

  it('leaves the layout alone at an edge', () => {
    expect(moveWidget(DEFAULT_LAYOUT, 'kpi.revenue', 'left')).toEqual(DEFAULT_LAYOUT);
    expect(moveWidget(DEFAULT_LAYOUT, 'kpi.revenue', 'up')).toEqual(DEFAULT_LAYOUT);
    expect(moveWidget(DEFAULT_LAYOUT, 'kpi.orders', 'right')).toEqual(DEFAULT_LAYOUT);
  });

  it('resizes within the minimum and the grid, without overlaps', () => {
    const wider = resizeWidget(DEFAULT_LAYOUT, 'kpi.revenue', 'wider');
    expect(at(wider, 'kpi.revenue').w).toBe(3);
    expect(overlaps(wider)).toBe(false);
    expect(resizeWidget(DEFAULT_LAYOUT, 'kpi.revenue', 'narrower')).toEqual(DEFAULT_LAYOUT);
    expect(at(resizeWidget(DEFAULT_LAYOUT, 'kpi.revenue', 'shorter'), 'kpi.revenue').h).toBe(3);
    expect(resizeWidget(DEFAULT_LAYOUT, 'table.channels', 'wider')).toEqual(DEFAULT_LAYOUT);
  });

  it('describes a placement in grid terms', () => {
    expect(describePlacement(DEFAULT_LAYOUT[1]!)).toBe('column 3, row 1, 2 columns by 4 rows');
  });
});
