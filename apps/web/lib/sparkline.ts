// A sparkline as one SVG path, so six KPI tiles don't mount six charting
// components for a decorative line. Pure and tested.

/**
 * Path data for `values` in a `width` × `height` box: x spreads the points
 * evenly, y spans the series' own min to max. Null values break the line
 * (a gap, not a dip to zero). Empty when there's nothing to draw.
 */
export function sparkPath(
  values: readonly (number | null)[],
  width: number,
  height: number,
): string {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return '';
  const min = Math.min(...nums);
  const span = Math.max(...nums) - min;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  // A flat series sits in the middle rather than on an edge.
  const y = (v: number) => (span === 0 ? height / 2 : height - ((v - min) / span) * height);
  const round = (n: number) => Math.round(n * 100) / 100;
  let path = '';
  let drawing = false;
  values.forEach((v, i) => {
    if (v === null) {
      drawing = false;
      return;
    }
    path += `${drawing ? 'L' : 'M'}${round(i * step)} ${round(y(v))}`;
    drawing = true;
  });
  return path;
}
