import { z } from 'zod';

// Dashboard layouts: which widgets a viewer placed where on the grid. The
// dashboard owns what each kind renders; the API only stores and validates
// the arrangement, keyed by an anonymous client id (there are no accounts).

/** Every widget the dashboard can place. */
export const WIDGET_KINDS = [
  'kpi.revenue',
  'kpi.spend',
  'kpi.roas',
  'kpi.cac',
  'kpi.conversionRate',
  'kpi.orders',
  'chart.revenue',
  'chart.channelMix',
  'table.channels',
  'table.campaigns',
  'table.orders',
] as const;
export const widgetKindSchema = z.enum(WIDGET_KINDS);
export type WidgetKind = z.infer<typeof widgetKindSchema>;

/** The grid is 12 columns wide; rows grow downwards. */
export const GRID_COLUMNS = 12;
export const MAX_WIDGETS = 40;

/** One placed widget, in grid units. */
export const layoutItemSchema = z
  .object({
    id: z.string().min(1).max(64),
    kind: widgetKindSchema,
    x: z
      .int()
      .min(0)
      .max(GRID_COLUMNS - 1),
    y: z.int().min(0).max(1_000),
    w: z.int().min(1).max(GRID_COLUMNS),
    h: z.int().min(1).max(40),
  })
  .refine(({ x, w }) => x + w <= GRID_COLUMNS, { message: 'widget overflows the grid' });
export type LayoutItem = z.infer<typeof layoutItemSchema>;

/** PUT /layouts/:clientId body. Ids must be unique: the grid tracks items by id. */
export const dashboardLayoutSchema = z.object({
  items: z
    .array(layoutItemSchema)
    .max(MAX_WIDGETS)
    .refine((items) => new Set(items.map((i) => i.id)).size === items.length, {
      message: 'widget ids must be unique',
    }),
});
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;

/** The client id is a random UUID the dashboard keeps in localStorage. */
export const clientIdSchema = z.uuid();

/** dashboard_layouts — one doc per client; the last write wins. */
export interface DashboardLayoutDoc extends DashboardLayout {
  _id: string;
  updatedAt: Date;
}

/** GET and PUT /layouts/:clientId response. */
export interface LayoutResponse extends DashboardLayout {
  updatedAt: string;
}
