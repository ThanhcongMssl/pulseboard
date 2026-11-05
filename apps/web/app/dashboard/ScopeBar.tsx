'use client';

import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import { isPreset, presetCovering, withChannel, withRange } from '../../lib/filters.ts';
import { formatDay } from '../../lib/format.ts';
import { useDashboard } from './DashboardContext.tsx';
import { useCampaignNames } from './data.ts';

const crumb = 'rounded px-1 py-0.5 text-ink-secondary hover:bg-line hover:text-ink';
const Sep = () => (
  <span aria-hidden className="text-muted">
    ›
  </span>
);

/**
 * Where the analysis stands: a breadcrumb from all channels down to the
 * selected channel and campaign, each step a way back up, plus a chip for a
 * custom range. Always rendered, so selecting something never shifts the page.
 */
export function ScopeBar() {
  const { filters, range, setFilters } = useDashboard();
  const names = useCampaignNames(range);
  const { channel, campaign } = filters;
  const steps = [
    { label: CHANNEL_LABELS.all, to: withChannel(filters, 'all') },
    ...(channel === 'all'
      ? []
      : [{ label: CHANNEL_LABELS[channel], to: { ...filters, campaign: null } }]),
    ...(campaign ? [{ label: names.get(campaign) ?? campaign, to: filters }] : []),
  ];

  return (
    <div className="flex min-h-7 flex-wrap items-center justify-between gap-2 text-sm">
      <nav aria-label="Drill-down">
        <ol className="flex flex-wrap items-center gap-1">
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <Sep />}
                {i === 1 && channel !== 'all' && (
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: CHANNEL_COLORS[channel] }}
                  />
                )}
                {last ? (
                  <span aria-current="location" className="px-1 py-0.5 font-medium text-ink">
                    {step.label}
                  </span>
                ) : (
                  <button type="button" onClick={() => setFilters(step.to)} className={crumb}>
                    {step.label}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {!isPreset(filters.range) && (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-raised py-0.5 pr-1 pl-3 text-ink-secondary">
          {formatDay(range.from)} – {formatDay(range.to)}
          <button
            type="button"
            aria-label="Clear custom range"
            onClick={() => setFilters(withRange(filters, { preset: presetCovering(range) }))}
            className="rounded-full p-1 text-muted hover:bg-line hover:text-ink"
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="size-3"
              fill="none"
              stroke="currentColor"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      )}
    </div>
  );
}
