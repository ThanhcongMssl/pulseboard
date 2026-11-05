'use client';

import type { DateRange, ReportChannel } from '@pulseboard/shared';
import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHANNEL_COLORS } from '../../lib/channels.ts';
import { formatCents, formatDay } from '../../lib/format.ts';
import type { ComparedPoint } from '../../lib/compare.ts';
import type { DailyPoint } from '../../lib/series.ts';
import { labelDay, zoomSelection } from '../../lib/zoom.ts';
import { axisProps, ChartTooltip } from './ChartTooltip.tsx';

interface Props {
  /** With previousRevenue while comparing with the previous period. */
  points: DailyPoint[] | ComparedPoint[];
  channel: ReportChannel;
  /** Dragging across the chart picked this range. */
  onZoom(range: DateRange): void;
}

/**
 * Revenue, ad spend and the prorated revenue target over time. All three are
 * money, so they share one y-axis. Revenue takes the channel's color (ink for
 * all channels); spend and target are neutral so they never read as channels.
 */
export function RevenueChart({ points, channel, onZoom }: Props) {
  // The days under the pointer at mouse down and now, while dragging to zoom.
  const [drag, setDrag] = useState<{ start: string; end: string } | null>(null);
  const selection = drag && zoomSelection(drag.start, drag.end);
  const revenueColor = channel === 'all' ? 'var(--ink-primary)' : CHANNEL_COLORS[channel];
  const hasSpend = points.some((p) => p.spend);
  const hasTarget = points.some((p) => p.targetRevenue !== null);
  const hasPrevious = points.some((p) => 'previousRevenue' in p && p.previousRevenue !== null);
  return (
    <ResponsiveContainer width="100%" height="100%" className="select-none">
      <LineChart
        data={points}
        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        onMouseDown={(state) => {
          const day = labelDay(state.activeLabel);
          setDrag(day ? { start: day, end: day } : null);
        }}
        onMouseMove={(state) => {
          const day = labelDay(state.activeLabel);
          if (drag && day) setDrag({ ...drag, end: day });
        }}
        onMouseUp={() => {
          if (selection) onZoom(selection);
          setDrag(null);
        }}
        onMouseLeave={() => setDrag(null)}
        style={{ cursor: 'crosshair' }}
      >
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="date" tickFormatter={formatDay} minTickGap={32} {...axisProps} />
        <YAxis tickFormatter={formatCents} width={64} axisLine={false} {...axisProps} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--axis)' }} />
        <Legend
          // Recharts sorts legend entries by name unless told not to; keep series order.
          itemSorter={null}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: 'var(--ink-secondary)' }}
        />
        <Line
          name="Revenue"
          dataKey="revenue"
          stroke={revenueColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-raised)' }}
          isAnimationActive={false}
        />
        {hasPrevious && (
          <Line
            name="Previous period"
            dataKey="previousRevenue"
            stroke={revenueColor}
            strokeWidth={1.5}
            strokeOpacity={0.6}
            strokeDasharray="6 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        )}
        {hasTarget && (
          <Line
            name="Target"
            dataKey="targetRevenue"
            stroke="var(--ink-muted)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        )}
        {hasSpend && (
          <Line
            name="Ad spend"
            dataKey="spend"
            stroke="var(--ink-secondary)"
            strokeWidth={2}
            strokeOpacity={0.6}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-raised)' }}
            isAnimationActive={false}
          />
        )}
        {selection && (
          <ReferenceArea
            x1={selection.from}
            x2={selection.to}
            fill="var(--accent)"
            fillOpacity={0.12}
            stroke="var(--accent)"
            strokeOpacity={0.5}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
