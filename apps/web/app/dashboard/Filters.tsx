'use client';

import { ALL_CHANNELS, CHANNELS, todayUtc, addDays, type ReportChannel } from '@pulseboard/shared';
import { useRef, useState, type FormEvent } from 'react';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import {
  isPreset,
  parseCustomRange,
  RANGE_PRESETS,
  toQuery,
  withChannel,
  withRange,
  type Filters as FilterState,
} from '../../lib/filters.ts';

interface Props {
  filters: FilterState;
  onChange(filters: FilterState): void;
}

const CUSTOM_ID = 'custom-range';
const segment =
  'rounded-md px-3 py-1.5 text-sm text-ink-secondary hover:bg-line aria-pressed:bg-ink aria-pressed:text-page';

/** Pick any range up to a year back, as dates; also the keyboard way to zoom. */
function CustomRange({ filters, onChange }: Props) {
  const popover = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const today = todayUtc();
  const current = toQuery(filters, today);

  const apply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const range = parseCustomRange(String(data.get('from')), String(data.get('to')), today);
    if (!range) return setError('Pick a start on or before the end, within the last year.');
    setError(null);
    popover.current?.hidePopover();
    onChange(withRange(filters, range));
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={CUSTOM_ID}
        aria-pressed={!isPreset(filters.range)}
        className={`${segment} [anchor-name:--custom-range]`}
      >
        Custom
      </button>
      <form
        // Re-read the inputs' defaults whenever the range changes elsewhere.
        key={`${current.from}:${current.to}`}
        ref={popover}
        id={CUSTOM_ID}
        popover="auto"
        onSubmit={apply}
        aria-label="Custom date range"
        className="m-0 w-72 rounded-xl border border-line bg-raised p-4 text-ink shadow-xl [position-anchor:--custom-range] [position-area:bottom_span-right] [margin-top:0.5rem]"
      >
        <div className="grid grid-cols-2 gap-3">
          {(['from', 'to'] as const).map((end) => (
            <label key={end} className="text-xs text-muted">
              {end === 'from' ? 'From' : 'To'}
              <input
                type="date"
                name={end}
                required
                defaultValue={current[end]}
                min={addDays(today, -365)}
                max={today}
                className="mt-1 block w-full rounded-md border border-line bg-page px-2 py-1 text-sm text-ink"
              />
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-critical">
            {error}
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-sm text-page">
            Apply
          </button>
        </div>
      </form>
    </>
  );
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
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={isPreset(filters.range) && filters.range.preset === preset}
            onClick={() => onChange(withRange(filters, { preset }))}
            className={segment}
          >
            {preset}d
          </button>
        ))}
        <CustomRange filters={filters} onChange={onChange} />
      </div>
      <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-1.5 text-sm">
        <span aria-hidden className="size-2.5 rounded-full" style={{ background: dot }} />
        <span className="sr-only">Channel</span>
        <select
          value={filters.channel}
          onChange={(e) => onChange(withChannel(filters, e.target.value as ReportChannel))}
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
