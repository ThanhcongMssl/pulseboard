'use client';

import type { ReportChannel } from '@pulseboard/shared';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHANNEL_COLORS } from '../../lib/channels.ts';
import { formatCents, formatDay } from '../../lib/format.ts';
import type { DailyPoint } from '../../lib/series.ts';
import { axisProps, ChartTooltip } from './ChartTooltip.tsx';

interface Props {
  points: DailyPoint[];
  channel: ReportChannel;
}

/**
 * Revenue, ad spend and the prorated revenue target over time. All three are
 * money, so they share one y-axis. Revenue takes the channel's color (ink for
 * all channels); spend and target are neutral so they never read as channels.
 */
export function RevenueChart({ points, channel }: Props) {
  const revenueColor = channel === 'all' ? 'var(--ink-primary)' : CHANNEL_COLORS[channel];
  const hasSpend = points.some((p) => p.spend);
  const hasTarget = points.some((p) => p.targetRevenue !== null);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="date" tickFormatter={formatDay} minTickGap={32} {...axisProps} />
        <YAxis tickFormatter={formatCents} width={64} axisLine={false} {...axisProps} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--axis)' }} />
        <Legend
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
      </LineChart>
    </ResponsiveContainer>
  );
}
