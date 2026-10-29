'use client';

import { useCallback, useEffect, useState } from 'react';

interface JsonState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * GET `url` as JSON, refetching when `url` changes or `refetch` is called.
 * Keeps the previous data while a new request is in flight, so the view
 * dims instead of flashing empty, and aborts requests that are superseded.
 */
export function useJson<T>(url: string) {
  const [state, setState] = useState<JsonState<T>>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        return (await res.json()) as T;
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const error = err instanceof Error ? err.message : String(err);
        setState((s) => ({ ...s, error, loading: false }));
      });
    return () => controller.abort();
  }, [url, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, refetch };
}
