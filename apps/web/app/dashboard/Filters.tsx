'use client';

import { ALL_CHANNELS, CHANNELS, type ReportChannel } from '@pulseboard/shared';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import { RANGE_PRESETS, type Filters as FilterState } from '../../lib/filters.ts';

interface Props {
  filters: FilterState;
  onChange(filters: FilterState): void;
}

export function Filters({ filters, onChange }: Props) {
  const dot = filters.channel === 'all' ? 'var(--ink-muted)' : CHANNEL_COLORS[filters.channel];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="group"
        aria-label="Date range"
        className="inline-flex rounded-lg border border-line bg-raised p-0.5"
      >
        {RANGE_PRESETS.map((range) => (
          <button
            key={range}
            type="button"
            aria-pressed={filters.range === range}
            onClick={() => onChange({ ...filters, range })}
            className="rounded-md px-3 py-1.5 text-sm text-ink-secondary hover:bg-line aria-pressed:bg-ink aria-pressed:text-page"
          >
            {range}d
          </button>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-1.5 text-sm">
        <span aria-hidden className="size-2.5 rounded-full" style={{ background: dot }} />
        <span className="sr-only">Channel</span>
        <select
          value={filters.channel}
          onChange={(e) => onChange({ ...filters, channel: e.target.value as ReportChannel })}
          className="bg-transparent text-ink outline-none"
        >
          {[ALL_CHANNELS, ...CHANNELS].map((channel) => (
            <option key={channel} value={channel}>
              {CHANNEL_LABELS[channel]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
