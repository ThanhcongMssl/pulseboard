import { describe, expect, it } from 'vitest';
import { describeUpdate } from './updates.ts';

describe('describeUpdate', () => {
  it('names one day and one channel', () => {
    expect(describeUpdate(['2026-11-02'], ['paid_search', 'all'])).toBe(
      'Reports updated for Nov 2 · Paid search',
    );
  });

  it('spans days in order and names two channels in display order', () => {
    expect(describeUpdate(['2026-11-02', '2026-10-30'], ['email', 'paid_social'])).toBe(
      'Reports updated for Oct 30 – Nov 2 · Paid social and Email',
    );
  });

  it('counts three or more channels, and leaves out none', () => {
    expect(describeUpdate(['2026-11-02'], ['email', 'direct', 'organic', 'all'])).toBe(
      'Reports updated for Nov 2 · 3 channels',
    );
    expect(describeUpdate(['2026-11-02'], ['all'])).toBe('Reports updated for Nov 2');
    expect(
      describeUpdate(['2026-11-02'], ['paid_social', 'paid_search', 'organic', 'email', 'direct']),
    ).toBe('Reports updated for Nov 2 · all channels');
  });

  it('is nothing when no day was rebuilt', () => {
    expect(describeUpdate([], ['email'])).toBeNull();
  });
});
