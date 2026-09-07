export interface Tile {
  label: string;
  value: string;
  note?: string;
}

/** Static stat tiles: a label, a number, and one plain line under it. */
export function Tiles({ tiles, columns = 4 }: { tiles: Tile[]; columns?: 3 | 4 | 5 }) {
  const grid = { 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-3 lg:grid-cols-5" }[columns];
  return (
    <dl className={`grid gap-4 ${grid}`}>
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-md border border-border bg-card p-4">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tile.label}</dt>
          <dd className="mt-1 font-heading text-2xl font-semibold tracking-tight">{tile.value}</dd>
          {tile.note ? <dd className="mt-1 text-sm leading-6 text-muted-foreground">{tile.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
