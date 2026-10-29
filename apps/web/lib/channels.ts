import type { Channel, ReportChannel } from '@pulseboard/shared';

export const CHANNEL_LABELS: Record<ReportChannel, string> = {
  paid_social: 'Paid social',
  paid_search: 'Paid search',
  organic: 'Organic',
  email: 'Email',
  direct: 'Direct',
  all: 'All channels',
};

/**
 * Series color per channel: a CSS variable defined in globals.css (light and
 * dark steps). Keyed by channel, never by position, so filtering a channel
 * out never repaints the others.
 */
export const CHANNEL_COLORS: Record<Channel, string> = {
  paid_social: 'var(--series-1)',
  paid_search: 'var(--series-2)',
  organic: 'var(--series-3)',
  email: 'var(--series-4)',
  direct: 'var(--series-5)',
};
