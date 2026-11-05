import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  filtersToSearch,
  parseCustomRange,
  parseFilters,
  presetCovering,
  toggleCampaign,
  toggleChannel,
  toQuery,
  withChannel,
  type Filters,
} from './filters.ts';

const TODAY = '2026-11-05';
const parse = (search: string) => parseFilters(new URLSearchParams(search), TODAY);

describe('parseFilters', () => {
  it('parses a preset, channel, campaign and compare', () => {
    expect(parse('range=7&channel=paid_social&campaign=fb_2&compare=prev')).toEqual({
      range: { preset: 7 },
      channel: 'paid_social',
      campaign: 'fb_2',
      compare: true,
    });
  });

  it('falls back to defaults on missing or unknown values', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
    expect(parse('range=12&channel=tv&campaign=a%20b&compare=yes')).toEqual(DEFAULT_FILTERS);
  });

  it('prefers a valid custom range over the preset', () => {
    expect(parse('range=7&from=2026-10-01&to=2026-10-10').range).toEqual({
      from: '2026-10-01',
      to: '2026-10-10',
    });
  });

  it('ignores an unusable custom range', () => {
    expect(parse('range=7&from=2026-10-10&to=2026-10-01').range).toEqual({ preset: 7 });
    expect(parse('from=2026-10-01').range).toEqual({ preset: 30 });
  });
});

describe('parseCustomRange', () => {
  it('accepts a single day and a full year', () => {
    expect(parseCustomRange('2026-11-05', '2026-11-05', TODAY)).not.toBeNull();
    expect(parseCustomRange('2025-11-05', '2026-11-05', TODAY)).not.toBeNull();
  });

  it('rejects bad dates, reversed, too long or future ranges', () => {
    expect(parseCustomRange('2026-02-30', '2026-03-01', TODAY)).toBeNull();
    expect(parseCustomRange('2026-11-02', '2026-11-01', TODAY)).toBeNull();
    expect(parseCustomRange('2025-11-04', '2026-11-05', TODAY)).toBeNull();
    expect(parseCustomRange('2026-11-01', '2026-11-06', TODAY)).toBeNull();
  });
});

describe('filtersToSearch', () => {
  it('drops defaults', () => {
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe('');
  });

  it('round-trips through the URL', () => {
    const cases: Filters[] = [
      { range: { preset: 90 }, channel: 'paid_search', campaign: null, compare: false },
      {
        range: { from: '2026-10-01', to: '2026-10-14' },
        channel: 'paid_social',
        campaign: 'fb_1',
        compare: true,
      },
    ];
    for (const filters of cases) expect(parse(filtersToSearch(filters).slice(1))).toEqual(filters);
    expect(filtersToSearch(cases[1]!)).toBe(
      '?from=2026-10-01&to=2026-10-14&channel=paid_social&campaign=fb_1&compare=prev',
    );
  });
});

describe('toQuery', () => {
  it('builds an inclusive preset range ending today', () => {
    expect(toQuery({ ...DEFAULT_FILTERS, range: { preset: 7 } }, TODAY)).toEqual({
      from: '2026-10-30',
      to: '2026-11-05',
    });
  });

  it('returns a custom range as is', () => {
    const range = { from: '2026-10-01', to: '2026-10-02' };
    expect(toQuery({ ...DEFAULT_FILTERS, range }, TODAY)).toBe(range);
  });
});

describe('transitions', () => {
  const social: Filters = { ...DEFAULT_FILTERS, channel: 'paid_social', campaign: 'fb_1' };

  it('drops the campaign when the channel changes, keeps it otherwise', () => {
    expect(withChannel(social, 'email')).toMatchObject({ channel: 'email', campaign: null });
    expect(withChannel(social, 'paid_social')).toEqual(social);
  });

  it('toggles a channel back to all', () => {
    expect(toggleChannel(DEFAULT_FILTERS, 'email').channel).toBe('email');
    expect(toggleChannel(social, 'paid_social')).toMatchObject({ channel: 'all', campaign: null });
    expect(toggleChannel(DEFAULT_FILTERS, 'all').channel).toBe('all');
  });

  it('selects a campaign with its channel, and deselects it', () => {
    expect(toggleCampaign(DEFAULT_FILTERS, 'gads_1', 'paid_search')).toMatchObject({
      channel: 'paid_search',
      campaign: 'gads_1',
    });
    expect(toggleCampaign(social, 'fb_1', 'paid_social')).toMatchObject({
      channel: 'paid_social',
      campaign: null,
    });
  });

  it('zooms out to the shortest preset containing the range', () => {
    expect(presetCovering({ from: '2026-11-01', to: '2026-11-03' }, TODAY)).toBe(7);
    expect(presetCovering({ from: '2026-10-07', to: '2026-10-20' }, TODAY)).toBe(30);
    expect(presetCovering({ from: '2026-08-08', to: '2026-08-20' }, TODAY)).toBe(90);
    expect(presetCovering({ from: '2026-01-01', to: '2026-01-20' }, TODAY)).toBe(30);
  });
});

describe('activeFilterCount', () => {
  it('counts what differs from the defaults', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, range: { preset: 7 }, compare: true })).toBe(2);
    expect(
      activeFilterCount({
        range: { from: '2026-10-01', to: '2026-10-02' },
        channel: 'paid_social',
        campaign: 'fb_1',
        compare: false,
      }),
    ).toBe(3);
  });
});
