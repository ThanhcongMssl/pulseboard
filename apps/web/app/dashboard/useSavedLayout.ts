'use client';

import { dashboardLayoutSchema, type LayoutItem, type LayoutResponse } from '@pulseboard/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getClientId } from '../../lib/clientId.ts';
import { env } from '../../lib/env.ts';
import { createHistory, push, redo, undo, type History } from '../../lib/history.ts';
import { queryKeys } from '../../lib/queries.ts';
import { DEFAULT_LAYOUT, sameLayout } from '../../lib/widgets.ts';

export type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';

/** Wait for a pause in editing before saving, so a burst of drags is one PUT. */
const SAVE_DEBOUNCE_MS = 800;

const layoutUrl = (clientId: string) => `${env.NEXT_PUBLIC_API_URL}/layouts/${clientId}`;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The saved layout, or null when this client has none yet (204) or it no longer validates. */
async function fetchLayout(clientId: string, signal: AbortSignal): Promise<LayoutItem[] | null> {
  const res = await fetch(layoutUrl(clientId), { signal, cache: 'no-store' });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  const parsed = dashboardLayoutSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.items : null;
}

const putInit = (items: readonly LayoutItem[]): RequestInit => ({
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items }),
});

async function saveLayout(clientId: string, items: readonly LayoutItem[]): Promise<LayoutResponse> {
  const res = await fetch(layoutUrl(clientId), putInit(items));
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  return (await res.json()) as LayoutResponse;
}

/**
 * The viewer's dashboard layout with undo/redo, saved to the API under their
 * anonymous client id. Every change is a history step and is shown at once;
 * the save follows after a pause. Until the saved layout has loaded, `items`
 * is null.
 */
export function useSavedLayout() {
  const queryClient = useQueryClient();
  const [clientId] = useState(() => getClientId(storage(), () => crypto.randomUUID()));
  const saved = useQuery({
    queryKey: queryKeys.layout(clientId),
    queryFn: ({ signal }) => fetchLayout(clientId, signal),
  });

  // Seeded once from the server (or the default when there's nothing saved or
  // it failed to load); from then on the local history is the source of truth.
  const [history, setHistory] = useState<History<LayoutItem[]> | null>(null);
  if (history === null && !saved.isPending) {
    setHistory(createHistory(saved.data ?? [...DEFAULT_LAYOUT]));
  }

  const [saveState, setSaveState] = useState<SaveState>('saved');
  const mutation = useMutation({
    mutationFn: (items: readonly LayoutItem[]) => saveLayout(clientId, items),
    onSuccess: (layout) => queryClient.setQueryData(queryKeys.layout(clientId), layout.items),
  });
  const timer = useRef<number | undefined>(undefined);
  const unsaved = useRef<readonly LayoutItem[] | null>(null);

  const flush = () => {
    clearTimeout(timer.current);
    const items = unsaved.current;
    if (!items) return;
    unsaved.current = null;
    setSaveState('saving');
    mutation.mutate(items, {
      // A newer edit may already be waiting; only the last save decides the state.
      onSuccess: () => unsaved.current === null && setSaveState('saved'),
      onError: () => {
        unsaved.current ??= items;
        setSaveState('error');
      },
    });
  };

  const scheduleSave = (items: readonly LayoutItem[]) => {
    unsaved.current = items;
    setSaveState('unsaved');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, SAVE_DEBOUNCE_MS);
  };

  const apply = (next: History<LayoutItem[]>) => {
    if (!history || next === history) return;
    setHistory(next);
    scheduleSave(next.present);
  };

  const actions = {
    /** Record a new arrangement (a drop, a resize, an added or removed widget). */
    commit: (items: LayoutItem[]) => history && apply(push(history, items, sameLayout)),
    undo: () => history && apply(undo(history)),
    redo: () => history && apply(redo(history)),
    reset: () => history && apply(push(history, [...DEFAULT_LAYOUT], sameLayout)),
    retrySave: flush,
  };

  // Leaving with a save still pending: send it anyway; keepalive lets the
  // request outlive the page.
  useEffect(() => {
    const onHide = () => {
      if (!unsaved.current) return;
      void fetch(layoutUrl(clientId), { ...putInit(unsaved.current), keepalive: true });
      unsaved.current = null;
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      clearTimeout(timer.current);
    };
  }, [clientId]);

  return {
    items: history?.present ?? null,
    canUndo: (history?.past.length ?? 0) > 0,
    canRedo: (history?.future.length ?? 0) > 0,
    isDefault: history ? sameLayout(history.present, DEFAULT_LAYOUT) : true,
    saveState,
    ...actions,
  };
}
