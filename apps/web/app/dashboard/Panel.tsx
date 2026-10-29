import type { ReactNode } from 'react';

export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-raised p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
