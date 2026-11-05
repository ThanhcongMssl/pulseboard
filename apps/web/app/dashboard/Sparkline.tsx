'use client';

import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';

/** A KPI's daily trend: no axes, no tooltip, decoration next to the number. */
export function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const data = useMemo(() => values.map((v, i) => ({ i, v })), [values]);
  if (values.every((v) => v === null)) return null;
  return (
    <div aria-hidden className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* Decoration only: no keyboard focus inside the aria-hidden wrapper. */}
        <LineChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
          accessibilityLayer={false}
        >
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
