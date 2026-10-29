import type { Source } from '@pulseboard/shared';
import { formatDay } from '../../lib/format.ts';
import type { StaleDay } from '../../lib/series.ts';

const SOURCE_LABELS: Record<Source, string> = {
  facebook_ads: 'Facebook Ads',
  google_ads: 'Google Ads',
  ga4: 'GA4',
  shopify: 'Shopify',
  sheets_targets: 'Targets sheet',
};

/** Days built on a source's last good data after its ingest gave up. */
export function StaleBanner({ days }: { days: StaleDay[] }) {
  if (days.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-warning bg-warning-wash p-4 text-sm"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="mt-0.5 size-5 shrink-0"
        fill="var(--status-warning)"
      >
        <path d="M10 2 1 18h18L10 2Zm-1 6h2v5H9V8Zm0 6h2v2H9v-2Z" />
      </svg>
      <div>
        <p className="font-medium">Some numbers use the last good data</p>
        <p className="mt-0.5 text-ink-secondary">
          A source failed after its retries, so these days keep its previous copy:{' '}
          {days
            .map(
              (d) => `${formatDay(d.date)} (${d.sources.map((s) => SOURCE_LABELS[s]).join(', ')})`,
            )
            .join('; ')}
          .
        </p>
      </div>
    </div>
  );
}
