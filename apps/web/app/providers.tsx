'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session; useState keeps it across re-renders.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Freshness comes from the WebSocket: a reports-updated event (or a
            // reconnect) invalidates exactly what changed, so data never goes
            // stale on a timer and focusing the tab doesn't refetch.
            staleTime: Infinity,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
