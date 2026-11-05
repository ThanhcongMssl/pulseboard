import { sparkPath } from '../../lib/sparkline.ts';

// Drawn in a fixed box and stretched to the tile; the stroke keeps its width.
const W = 100;
const H = 32;

/** A KPI's daily trend: one decorative line, no axes, no tooltip. */
export function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const d = sparkPath(values, W, H);
  if (!d) return null;
  return (
    <svg
      aria-hidden
      viewBox={`0 -2 ${W} ${H + 4}`}
      preserveAspectRatio="none"
      className="block size-full overflow-visible"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
