'use client';

import { CHANNELS, type Channel, type ReportChannel } from '@pulseboard/shared';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import { formatCents, formatDay } from '../../lib/format.ts';
import type { StackPoint } from '../../lib/series.ts';
import { axisProps, ChartTooltip } from './ChartTooltip.tsx';

interface Props {
  points: StackPoint[];
  selected: ReportChannel;
  /** A channel was clicked, in the legend or on a bar. */
  onSelect(channel: Channel): void;
  /** The chart in one sentence, its accessible name (see lib/a11y.ts). */
  label: string;
}

/** The legend as buttons, in the same fixed order as the channel table. */
function ChannelLegend({ selected, onSelect }: Pick<Props, 'selected' | 'onSelect'>) {
  return (
    <ul aria-label="Channels" className="mb-2 flex flex-wrap gap-x-1 gap-y-0.5 text-xs">
      {CHANNELS.map((channel) => (
        <li key={channel}>
          <button
            type="button"
            aria-pressed={selected === channel}
            onClick={() => onSelect(channel)}
            className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-ink-secondary hover:bg-line aria-pressed:bg-line aria-pressed:text-ink ${selected !== 'all' && selected !== channel ? 'opacity-50' : ''}`}
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: CHANNEL_COLORS[channel] }}
            />
            {CHANNEL_LABELS[channel]}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Daily revenue stacked by channel, in the fixed channel order. With one
 * channel selected, the others fade so it stands out against the total.
 * Clicking a channel's bars or legend entry selects it (again: deselects).
 */
export function ChannelMixChart({ points, selected, onSelect, label }: Props) {
  return (
    <div className="flex h-full flex-col">
      <ChannelLegend selected={selected} onSelect={onSelect} />
      {/* The bars are an image to assistive tech; the legend above is the keyboard way to select. */}
      <div role="img" aria-label={label} className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
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
                onClick={() => onSelect(channel)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
