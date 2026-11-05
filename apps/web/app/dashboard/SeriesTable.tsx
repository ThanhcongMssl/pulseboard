export interface Column<R> {
  label: string;
  cell(row: R): string;
  numeric?: boolean;
}

/** A chart's data as a table: the "Table" view of a chart widget. */
export function SeriesTable<R extends { date: string }>({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: Column<R>[];
  rows: readonly R[];
}) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-raised text-xs text-muted">
          <tr className="border-b border-line">
            {columns.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={`px-3 py-2 font-medium ${c.numeric ? 'text-right' : 'text-left'}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-b border-line last:border-0">
              {columns.map((c, i) =>
                i === 0 ? (
                  <th key={c.label} scope="row" className="px-3 py-1.5 text-left font-normal">
                    {c.cell(r)}
                  </th>
                ) : (
                  <td
                    key={c.label}
                    className={`px-3 py-1.5 ${c.numeric ? 'text-right tabular-nums' : ''}`}
                  >
                    {c.cell(r)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Switches a chart widget between the chart and its table. */
export function TableToggle({ on, onChange }: { on: boolean; onChange(on: boolean): void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-secondary hover:bg-line aria-pressed:bg-line aria-pressed:text-ink"
    >
      Table
    </button>
  );
}
