import type { CSSProperties } from "react";

type IndexedStyle = CSSProperties & { "--i": number };

export interface CoverageTile {
  found: boolean;
  title: string | null;
  detail: string;
}

/**
 * One tile per outcome. The entrance is a CSS stagger rather than a motion
 * component: `useReducedMotion()` has no value during SSR, so using it to pick
 * an initial style hydrates differently for anyone with reduced motion on.
 * The reduced-motion block in globals.css already covers `.viz *`.
 */
export function Coverage({
  label,
  tiles,
}: {
  label: string;
  tiles: CoverageTile[];
}) {
  return (
    <figure className="viz" role="img" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="grid gap-2 sm:grid-cols-5" aria-hidden="true">
        {tiles.map((tile, index) => {
          const style: IndexedStyle = { "--i": index };

          return (
            <div
              key={index}
              style={style}
              className={
                tile.found
                  ? "coverage-tile min-h-28 border border-ng-green-300 bg-ng-tint-2 p-4"
                  : "coverage-tile coverage-missed min-h-28 border border-border p-4"
              }
            >
              <p className="font-mono text-[10px] leading-5 text-muted-foreground">
                {tile.title === null ? (
                  tile.detail
                ) : (
                  <>
                    <span className="block font-semibold text-ng-green-800">{tile.title}</span>
                    {tile.detail}
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
