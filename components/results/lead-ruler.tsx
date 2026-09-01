import type { CSSProperties } from "react";

import {
  formatDate,
  formatMonth,
  monthTicks,
  timeScale,
  type DateSpan,
  type MatchedCaseStudy,
} from "@/lib/dossier";

type IndexedStyle = CSSProperties & { "--i": number };

export function LeadRuler({ hit }: { hit: MatchedCaseStudy }) {
  const signal = hit.events[0];
  const outcome = hit.verdict.outcome;
  const span: DateSpan = { min: signal.date, max: outcome.date };
  const scale = timeScale(span);
  const ticks = monthTicks(span);
  const coordinate = (date: typeof signal.date) => 60 + scale(date) * 8.8;
  const label = `${hit.district} board signal on ${formatDate(signal.date)} preceded the ${outcome.type} on ${formatDate(outcome.date)} by ${hit.verdict.leadDays} days.`;

  return (
    <figure
      className="viz mt-4"
      role="img"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <div className="hero-dimension mx-[6%] flex items-center gap-3 sm:gap-4">
        <span
          className="relative h-px flex-1 bg-ng-green-300 before:absolute before:top-1/2 before:left-0 before:h-2.5 before:w-px before:-translate-y-1/2 before:bg-ng-green-300"
          aria-hidden="true"
        />
        <span className="font-heading text-2xl leading-none font-semibold tracking-[-0.04em] text-foreground tabular-nums sm:text-3xl">
          {hit.verdict.leadDays} days
        </span>
        <span
          className="relative h-px flex-1 bg-ng-green-300 after:absolute after:top-1/2 after:right-0 after:h-2.5 after:w-px after:-translate-y-1/2 after:bg-ng-green-300"
          aria-hidden="true"
        />
      </div>
      <svg
        className="mt-2 w-full overflow-visible"
        viewBox="0 0 1000 84"
        aria-hidden="true"
      >
        <path
          d="M 940 40 H 60"
          pathLength="100"
          className="hero-ruler-line fill-none stroke-ng-green-400"
          strokeWidth="2"
        />
        {ticks.map((tick, index) => {
          const x = coordinate(tick);
          const style: IndexedStyle = { "--i": ticks.length - index - 1 };

          return (
            <g
              key={tick}
              className="hero-ruler-tick"
              style={style}
            >
              <line
                x1={x}
                x2={x}
                y1="32"
                y2="48"
                className="stroke-ng-green-300"
                strokeWidth="1"
              />
              <text
                x={x}
                y="68"
                textAnchor="middle"
                className="hidden fill-muted-foreground font-mono text-[11px] sm:block"
              >
                {formatMonth(tick)}
              </text>
            </g>
          );
        })}
        <g className="hero-board-endpoint">
          <circle cx="60" cy="40" r="8" className="fill-ng-green-400" />
          <circle cx="60" cy="40" r="14" className="fill-none stroke-ng-green-200" />
        </g>
        <g className="hero-rfp-endpoint">
          <circle cx="940" cy="40" r="12" className="fill-background stroke-ng-orange" strokeWidth="3" />
          <circle cx="940" cy="40" r="3" className="fill-ng-orange" />
        </g>
      </svg>
      <div className="mx-[6%] -mt-1 grid grid-cols-2 gap-4 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
        <p className="hero-board-label">
          <span className="font-semibold text-ng-green-600">Board packet</span>
          <span className="block">{formatDate(signal.date)}</span>
        </p>
        <p className="hero-rfp-label text-right">
          <span className="font-semibold text-ng-orange">{outcome.type}</span>
          <span className="block">{formatDate(outcome.date)}</span>
        </p>
      </div>
    </figure>
  );
}
