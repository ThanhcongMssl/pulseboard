import { describe, expect, it } from 'vitest';
import { cac, conversionRate, ctr, roas } from './kpi.ts';

describe('roas', () => {
  it('divides revenue by spend', () => {
    expect(roas(50_000, 12_500)).toBe(4);
  });

  it('is null when there is no spend', () => {
    expect(roas(50_000, 0)).toBeNull();
  });

  it('is 0 when spend produced no revenue', () => {
    expect(roas(0, 12_500)).toBe(0);
  });
});

describe('cac', () => {
  it('divides spend by new customers', () => {
    expect(cac(30_000, 4)).toBe(7_500);
  });

  it('rounds to whole cents', () => {
    expect(cac(10_000, 3)).toBe(3_333);
  });

  it('is null when there are no new customers', () => {
    expect(cac(30_000, 0)).toBeNull();
  });

  it('is null without spend: unpaid customers have no acquisition cost', () => {
    expect(cac(0, 12)).toBeNull();
  });
});

describe('ctr', () => {
  it('divides clicks by impressions', () => {
    expect(ctr(15, 1_000)).toBe(0.015);
  });

  it('is null without impressions', () => {
    expect(ctr(0, 0)).toBeNull();
  });
});

describe('conversionRate', () => {
  it('divides orders by sessions', () => {
    expect(conversionRate(25, 1_000)).toBe(0.025);
  });

  it('is null when there is no traffic', () => {
    expect(conversionRate(0, 0)).toBeNull();
  });
});
