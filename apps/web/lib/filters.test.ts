import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, filtersToSearch, parseFilters, toQuery } from './filters.ts';

describe('filters', () => {
  it('parses valid params', () => {
    expect(parseFilters(new URLSearchParams('range=7&channel=email'))).toEqual({
      range: 7,
      channel: 'email',
    });
  });

  it('falls back to defaults on missing or unknown values', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
    expect(parseFilters(new URLSearchParams('range=12&channel=tv'))).toEqual(DEFAULT_FILTERS);
  });

  it('round-trips through the URL and drops defaults', () => {
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe('');
    const filters = { range: 90, channel: 'paid_search' } as const;
    expect(filtersToSearch(filters)).toBe('?range=90&channel=paid_search');
    expect(parseFilters(new URLSearchParams(filtersToSearch(filters)))).toEqual(filters);
  });

  it('builds an inclusive range ending today', () => {
    expect(toQuery({ range: 7, channel: 'all' }, '2026-10-29')).toEqual({
      from: '2026-10-23',
      to: '2026-10-29',
    });
  });
});
