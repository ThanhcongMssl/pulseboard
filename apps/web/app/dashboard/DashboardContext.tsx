'use client';

import type { IsoDate } from '@pulseboard/shared';
import { createContext, useContext } from 'react';
import type { Filters } from '../../lib/filters.ts';
import type { DateRange } from '../../lib/queries.ts';

/** What every widget needs from the page: the filters, and a way to change them. */
export interface DashboardState {
  filters: Filters;
  /** The filters' date range, inclusive. */
  range: DateRange;
  /** Every day of `range`, for gap-preserving chart series. */
  dates: IsoDate[];
  setFilters(next: Filters): void;
}

const DashboardContext = createContext<DashboardState | null>(null);

export const DashboardProvider = DashboardContext.Provider;

export function useDashboard(): DashboardState {
  const state = useContext(DashboardContext);
  if (!state) throw new Error('useDashboard must be used inside the dashboard');
  return state;
}
