'use client';

import { ALL_CHANNELS, CHANNELS, todayUtc, addDays, type ReportChannel } from '@pulseboard/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import {
  activeFilterCount,
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

/**
 * The filter controls: a row on wider screens. On phones they would take
 * three rows above the data, so they collapse into a "Filters" button that
 * opens them as a bottom sheet. It's one set of controls either way, only
 * restyled, so the custom-range popover and its id exist once.
 */
export function Filters({ filters, onChange }: Props) {
  const dot = filters.channel === 'all' ? 'var(--ink-muted)' : CHANNEL_COLORS[filters.channel];
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const count = activeFilterCount(filters);

  // Opening moves focus into the sheet; closing returns it to the button.
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) sheet.current?.querySelector<HTMLElement>('button, select')?.focus();
  }, [open]);
  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-expanded={open}
        aria-controls="filter-sheet"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-1.5 text-sm md:hidden"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor">
          <path d="M2 4h12M4 8h8M6 12h4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Filters{count > 0 && <span className="text-muted">· {count}</span>}
      </button>
      {open && (
        <div aria-hidden className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={close} />
      )}
      <div
        ref={sheet}
        id="filter-sheet"
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label={open ? 'Filters' : undefined}
        onKeyDown={(e) => open && e.key === 'Escape' && close()}
        className={`${open ? 'sheet fixed inset-x-0 bottom-0 z-50 flex flex-col items-stretch gap-4 rounded-t-2xl border-t border-line bg-raised p-4 pb-6 shadow-xl' : 'hidden'} md:static md:z-auto md:flex md:flex-row md:flex-wrap md:items-center md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {open && (
          <div className="flex items-center justify-between md:hidden">
            <h2 className="text-base font-semibold">Filters</h2>
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-ink px-3 py-1.5 text-sm text-page"
            >
              Done
            </button>
          </div>
        )}
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
        <button
          type="button"
          aria-pressed={filters.compare}
          onClick={() => onChange({ ...filters, compare: !filters.compare })}
          title="Compare with the previous period of the same length"
          className="rounded-lg border border-line bg-raised px-3 py-1.5 text-sm text-ink-secondary hover:bg-line aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-page"
        >
          Compare
        </button>
      </div>
    </>
  );
}
