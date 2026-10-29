// KPI math shared by the aggregation job and anything that recomputes a
// ratio for display. Ratios are null when the denominator is zero: a channel
// with no spend has no ROAS, rather than a ROAS of 0 or Infinity.

const ratio = (numerator: number, denominator: number): number | null =>
  denominator === 0 ? null : numerator / denominator;

/** Return on ad spend: revenue / spend (unitless). */
export const roas = (revenueCents: number, spendCents: number) => ratio(revenueCents, spendCents);

/** Customer acquisition cost: spend / new customers, rounded to whole cents like all money. */
export const cac = (spendCents: number, newCustomers: number) => {
  const value = ratio(spendCents, newCustomers);
  return value === null ? null : Math.round(value);
};

/** Conversion rate: orders / sessions, as a fraction (0.025 = 2.5%). */
export const conversionRate = (orders: number, sessions: number) => ratio(orders, sessions);
