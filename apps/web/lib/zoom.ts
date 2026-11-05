import { isoDateSchema, type DateRange } from '@pulseboard/shared';

// Drag-to-zoom on a daily chart: the two days under the pointer at mouse down
// and mouse up become a custom range. Pure, so the edge cases are tested here.

/** A chart's active label as a day, or null when the pointer isn't over one. */
export const labelDay = (label: unknown) => {
  const day = isoDateSchema.safeParse(label);
  return day.success ? day.data : null;
};

/**
 * The range between two dragged-to days, in order. Null unless it spans at
 * least two days, so a plain click (or a drag that never left one day) isn't a zoom.
 */
export function zoomSelection(a: string | null, b: string | null): DateRange | null {
  if (!a || !b || a === b) return null;
  return a < b ? { from: a, to: b } : { from: b, to: a };
}
