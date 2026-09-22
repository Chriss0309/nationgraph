export interface Tile {
  label: string;
  value: string;
  note?: string;
  /** Pull one metric forward as the headline of the row. */
  emphasis?: boolean;
}

const GRID = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
} as const;

/**
 * Stat cells separated by hairlines rather than boxed. Borders here carry
 * structure, so they stay; depth would be the wrong signal for a ledger.
 */
export function Tiles({
  tiles,
  columns = 4,
  tone = "plain",
}: {
  tiles: Tile[];
  columns?: 3 | 4 | 5;
  tone?: "plain" | "inverse";
}) {
  const divider = tone === "inverse" ? "border-white/15" : "border-border";
  const label = tone === "inverse" ? "text-white/55" : "text-muted-foreground";
  const note = tone === "inverse" ? "text-white/70" : "text-muted-foreground";

  return (
    <dl className={`grid ${GRID[columns]} border-t ${divider}`}>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={`group border-b ${divider} px-0 py-5 sm:px-6 sm:py-6 sm:first:pl-0 sm:[&+*]:border-l ${divider}`}
        >
          <dt className={`eyebrow ${label}`}>{tile.label}</dt>
          <dd
            className={`stat-value mt-2 font-heading text-[2.125rem] leading-none font-semibold tracking-[-0.03em] sm:text-[2.5rem] ${
              tile.emphasis ? "text-primary" : ""
            } ${tone === "inverse" ? "text-white" : ""}`}
          >
            {tile.value}
          </dd>
          {tile.note ? (
            <dd className={`mt-3 max-w-[34ch] text-[0.8125rem] leading-6 ${note}`}>{tile.note}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
