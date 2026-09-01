import type { ReactNode } from "react";

import { LeadRuler } from "@/components/results/lead-ruler";
import { formatMoney, type MatchedCaseStudy } from "@/lib/dossier";

function highlightedEvidence(
  evidence: string,
  highlights: string[],
): ReactNode[] {
  const ranges = highlights
    .filter(Boolean)
    .map((text) => ({ start: evidence.indexOf(text), text }))
    .filter(({ start }) => start >= 0)
    .sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start < cursor) continue;
    if (range.start > cursor) {
      parts.push(evidence.slice(cursor, range.start));
    }
    parts.push(
      <mark
        key={`${range.start}-${range.text}`}
        className="hero-quote-highlight bg-transparent text-inherit"
      >
        {range.text}
      </mark>,
    );
    cursor = range.start + range.text.length;
  }

  if (cursor < evidence.length) {
    parts.push(evidence.slice(cursor));
  }

  return parts.length > 0 ? parts : [evidence];
}

export function Hero({
  docs,
  hit,
  medianLeadDays,
}: {
  docs: number;
  hit: MatchedCaseStudy | null;
  medianLeadDays: number | null;
}) {
  const claimDays = medianLeadDays ?? hit?.verdict.leadDays ?? null;
  const signal = hit?.events[0] ?? null;
  const quoteHighlights =
    signal === null
      ? []
      : [
          hit?.initiative ?? "",
          signal.amount === null ? "" : formatMoney(signal.amount),
        ];

  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <span className="font-heading text-base font-semibold tracking-[-0.02em]">
            DemoGraph
          </span>
          <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground sm:text-xs">
            Research prototype · Florida school districts
          </span>
        </div>
      </header>

      <section className="hero-surface flex min-h-[calc(100svh-3.5rem)] items-center border-b border-border">
        <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          <div className="hero-copy max-w-4xl">
            <h1 className="font-heading text-[clamp(2.75rem,6.2vw,4.75rem)] leading-[0.96] font-semibold tracking-[-0.055em] text-balance text-white">
              {claimDays === null
                ? "Know before the RFP drops."
                : `Know ${claimDays} days before the RFP drops.`}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
              A working prototype I built to answer one question: can a
              purchase be spotted in public board paper before the RFP drops?
            </p>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              It read {docs} real Florida board documents, linked purchase
              mentions across meetings, and was graded against the RFPs that
              followed.
            </p>
          </div>

          <div className="mt-6 rounded-md border border-white/20 bg-background/95 p-5 shadow-[0_24px_60px_rgb(13_38_25/35%)] backdrop-blur-sm sm:mt-8 sm:p-7">
            {hit === null || signal === null ? (
              <p className="font-mono text-xs text-muted-foreground">
                No matched case in the current run.
              </p>
            ) : (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
                  Backtest · {hit.district}
                </p>
                <LeadRuler hit={hit} />
                <p className="hero-quote mt-4 overflow-hidden border-t border-border pt-4 text-ellipsis whitespace-nowrap font-mono text-[10px] leading-5 text-foreground sm:text-xs">
                  {highlightedEvidence(signal.evidence, quoteHighlights)}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
