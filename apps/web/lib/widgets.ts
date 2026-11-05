import { GRID_COLUMNS, WIDGET_KINDS, type LayoutItem, type WidgetKind } from '@pulseboard/shared';

// The widget library and layout operations of the dashboard builder. Pure,
// so adding, removing and converting layouts is tested without a grid.

export interface WidgetSpec {
  title: string;
  /** One line for the widget library. */
  description: string;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

const kpi = (title: string, description: string): WidgetSpec => ({
  title,
  description,
  w: 2,
  h: 3,
  minW: 2,
  minH: 3,
});

export const WIDGETS: Record<WidgetKind, WidgetSpec> = {
  'kpi.revenue': kpi('Revenue', 'Range revenue and pacing against target'),
  'kpi.spend': kpi('Ad spend', 'Paid media spend'),
  'kpi.roas': kpi('ROAS', 'Revenue per dollar of ad spend'),
  'kpi.cac': kpi('CAC', 'Ad spend per new customer'),
  'kpi.conversionRate': kpi('Conversion rate', 'Orders per session'),
  'kpi.orders': kpi('Orders', 'Order count and average order value'),
  'chart.revenue': {
    title: 'Revenue vs. target',
    description: 'Daily revenue, target and ad spend',
    w: 6,
    h: 9,
    minW: 4,
    minH: 7,
  },
  'chart.channelMix': {
    title: 'Revenue by channel',
    description: 'Daily revenue stacked by channel',
    w: 6,
    h: 9,
    minW: 4,
    minH: 7,
  },
  'table.channels': {
    title: 'Channels',
    description: 'Range KPIs for every channel',
    w: 12,
    h: 9,
    minW: 6,
    minH: 6,
  },
  'table.campaigns': {
    title: 'Campaigns',
    description: 'Spend, attributed revenue and ROAS per ad campaign',
    w: 12,
    h: 9,
    minW: 6,
    minH: 5,
  },
  'table.orders': {
    title: 'Latest orders',
    description: 'The latest orders in the range',
    w: 12,
    h: 10,
    minW: 6,
    minH: 6,
  },
};

/** Library order: KPIs, then charts, then tables. */
export const WIDGET_ORDER: readonly WidgetKind[] = WIDGET_KINDS;

// A widget's id is its kind: each kind appears at most once on a dashboard.
const place = (kind: WidgetKind, x: number, y: number): LayoutItem => ({
  id: kind,
  kind,
  x,
  y,
  w: WIDGETS[kind].w,
  h: WIDGETS[kind].h,
});

/** The arrangement a new viewer sees, and what "Reset layout" restores. */
export const DEFAULT_LAYOUT: readonly LayoutItem[] = [
  place('kpi.revenue', 0, 0),
  place('kpi.spend', 2, 0),
  place('kpi.roas', 4, 0),
  place('kpi.cac', 6, 0),
  place('kpi.conversionRate', 8, 0),
  place('kpi.orders', 10, 0),
  place('chart.revenue', 0, 3),
  place('chart.channelMix', 6, 3),
  place('table.channels', 0, 12),
  place('table.campaigns', 0, 21),
];

/** The first free row below every widget. */
const bottom = (items: readonly LayoutItem[]) => Math.max(0, ...items.map((i) => i.y + i.h));

/** Add a widget at the bottom, full default size; a kind already placed is left as is. */
export function addWidget(items: readonly LayoutItem[], kind: WidgetKind): LayoutItem[] {
  if (items.some((i) => i.kind === kind)) return [...items];
  return [...items, place(kind, 0, bottom(items))];
}

export const removeWidget = (items: readonly LayoutItem[], id: string): LayoutItem[] =>
  items.filter((i) => i.id !== id);

/** Grid geometry as react-grid-layout reads it: `i` for the id, plus the minimum size. */
export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

export const toGrid = (items: readonly LayoutItem[]): GridItem[] =>
  items.map(({ id, kind, x, y, w, h }) => ({
    i: id,
    x,
    y,
    w,
    h,
    minW: WIDGETS[kind].minW,
    minH: WIDGETS[kind].minH,
  }));

/**
 * Our items with the geometry from a grid layout. Widgets the grid doesn't
 * know keep their place; the result is clamped to the grid so it always
 * passes the API's layout schema.
 */
export function fromGrid(
  items: readonly LayoutItem[],
  grid: readonly Pick<GridItem, 'i' | 'x' | 'y' | 'w' | 'h'>[],
): LayoutItem[] {
  const byId = new Map(grid.map((g) => [g.i, g]));
  return items.map((item) => {
    const g = byId.get(item.id);
    if (!g) return item;
    const w = Math.min(Math.max(1, g.w), GRID_COLUMNS);
    return {
      ...item,
      x: Math.min(Math.max(0, g.x), GRID_COLUMNS - w),
      y: Math.max(0, g.y),
      w,
      h: g.h,
    };
  });
}

/** Whether two layouts place the same widgets in the same spots (order doesn't matter). */
export function sameLayout(a: readonly LayoutItem[], b: readonly LayoutItem[]): boolean {
  if (a.length !== b.length) return false;
  const key = (i: LayoutItem) => `${i.id}:${i.x},${i.y},${i.w},${i.h}`;
  const keys = new Set(a.map(key));
  return b.every((i) => keys.has(key(i)));
}

/** Reading order (row, then column), for the single-column phone layout. */
export const readingOrder = (items: readonly LayoutItem[]): LayoutItem[] =>
  [...items].sort((a, b) => a.y - b.y || a.x - b.x);
