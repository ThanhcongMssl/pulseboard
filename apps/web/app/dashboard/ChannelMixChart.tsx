'use client';

import { CHANNELS, type ReportChannel } from '@pulseboard/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import { formatCents, formatDay } from '../../lib/format.ts';
import type { StackPoint } from '../../lib/series.ts';
import { axisProps, ChartTooltip } from './ChartTooltip.tsx';

/**
 * Daily revenue stacked by channel, in the fixed channel order. With one
 * channel selected, the others fade so it stands out against the total.
 */
export function ChannelMixChart({
  points,
  selected,
}: {
  points: StackPoint[];
  selected: ReportChannel;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={points}
        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="date" tickFormatter={formatDay} minTickGap={32} {...axisProps} />
        <YAxis tickFormatter={formatCents} width={64} axisLine={false} {...axisProps} />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: 'var(--border)' }}
          itemSorter={(item) => -CHANNELS.indexOf(item.dataKey as (typeof CHANNELS)[number])}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--ink-secondary)' }} />
        {CHANNELS.map((channel, i) => (
          <Bar
            key={channel}
            dataKey={channel}
            name={CHANNEL_LABELS[channel]}
            stackId="revenue"
            fill={CHANNEL_COLORS[channel]}
            fillOpacity={selected === 'all' || selected === channel ? 1 : 0.25}
            // A surface-colored stroke leaves a hairline gap between segments.
            stroke="var(--surface-raised)"
            strokeWidth={1}
            radius={i === CHANNELS.length - 1 ? [4, 4, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
