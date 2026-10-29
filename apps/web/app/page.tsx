import { CHANNELS } from '@pulseboard/shared';

// Placeholder until the dashboard lands on Day 5.
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Pulseboard</h1>
      <p className="mt-2 text-slate-600">Marketing analytics dashboard: coming soon.</p>
      <p className="mt-6 text-sm text-slate-500">Channels: {CHANNELS.join(', ')}</p>
    </main>
  );
}
