import { Reveal } from "@/components/results/reveal";
import {
  formatDate,
  formatMoney,
  type MatchedCaseStudy,
} from "@/lib/dossier";

export function ExhibitA({ hit }: { hit: MatchedCaseStudy | null }) {
  const signal = hit?.events[0] ?? null;

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <h2 className="section-title">It was sitting in the agenda packet.</h2>
            <p className="section-lede">
              A real line from a school-board agenda packet — vendor and
              dollar amount attached, months before the RFP.
            </p>
          </div>

          {hit === null || signal === null ? (
            <div className="border border-border bg-background p-8 font-mono text-sm text-muted-foreground">
              No matched evidence is available in the current run.
            </div>
          ) : (
            <Reveal>
              <figure
                className="viz"
                role="img"
                aria-label={`Verbatim evidence from ${hit.district} on ${formatDate(signal.date)} showing ${hit.initiative}.`}
              >
                <span className="sr-only">
                  The exact source line that preceded the matched procurement.
                </span>
                <div className="border border-border bg-background p-5 shadow-[0_20px_60px_rgba(31,32,30,0.06)] sm:p-8">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground sm:text-xs">
                    {signal.date} · {signal.source.context} ·{" "}
                    {signal.source.label}
                  </p>
                  <p className="evidence evidence-highlight mt-8 font-mono text-sm leading-7 text-foreground sm:text-base sm:leading-8">
                    {signal.evidence}
                  </p>

                  <div className="mt-9 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
                    <div className="annotation">
                      <span className="annotation-line" aria-hidden="true" />
                      <p className="annotation-label">
                        <span>Vendor</span>
                        {signal.vendor ?? "Not listed"}
                      </p>
                    </div>
                    <div className="annotation">
                      <span className="annotation-line" aria-hidden="true" />
                      <p className="annotation-label">
                        <span>Amount</span>
                        {signal.amount === null
                          ? "Not listed"
                          : formatMoney(signal.amount)}
                      </p>
                    </div>
                    <div className="annotation">
                      <span className="annotation-line" aria-hidden="true" />
                      <p className="annotation-label">
                        <span>Board action</span>
                        {signal.action}
                      </p>
                    </div>
                  </div>
                </div>
              </figure>

              {hit.verdict.outcome.url === null ? (
                <p className="outcome-chip mt-4 border border-ng-orange/35 bg-background px-4 py-3 text-sm leading-6">
                  <span className="mr-2 text-ng-orange" aria-hidden="true">
                    ●
                  </span>
                  The RFP followed on {formatDate(hit.verdict.outcome.date)} ·{" "}
                  &quot;{hit.verdict.outcome.title}&quot;
                </p>
              ) : (
                <a
                  href={hit.verdict.outcome.url}
                  target="_blank"
                  rel="noreferrer"
                  className="outcome-chip mt-4 block border border-ng-orange/35 bg-background px-4 py-3 text-sm leading-6 transition-colors hover:border-ng-orange"
                >
                  <span className="mr-2 text-ng-orange" aria-hidden="true">
                    ●
                  </span>
                  The RFP followed on {formatDate(hit.verdict.outcome.date)} ·{" "}
                  &quot;{hit.verdict.outcome.title}&quot;
                </a>
              )}

              <p className="mt-4 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                Quote gate: every event must quote its source
                character-for-character, or it is dropped.
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
