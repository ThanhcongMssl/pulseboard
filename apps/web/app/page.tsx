import { Suspense } from 'react';
import { Dashboard } from './dashboard/Dashboard.tsx';
import { DashboardSkeleton } from './dashboard/DashboardSkeleton.tsx';

// The dashboard reads its filters from the URL (useSearchParams), so it
// renders in the browser under a Suspense boundary; the shell is static.
export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
