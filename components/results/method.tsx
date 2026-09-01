import type { ReactNode } from "react";

import { Funnel } from "@/components/results/viz/funnel";
import type { DossierMetrics, Scoreboard } from "@/lib/dossier";

function MethodStep({
  body,
  index,
  title,
}: {
  body: ReactNode;
  index: number;
  title: string;
}) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-4 border-t border-border py-5">
      <span className="font-mono text-xs text-muted-foreground">
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-heading text-lg font-semibold tracking-[-0.02em]">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

export function Method({
  metrics,
  outcomeYear,
  scoreboard,
}: {
  metrics: DossierMetrics;
  outcomeYear: string | null;
  scoreboard: Scoreboard;
}) {
  const districts = scoreboard.purchasers.total + scoreboard.controls.total;
  const stages = [
    `${metrics.docs} documents`,
    `${metrics.events} verified events`,
    `${metrics.clusters} trajectories`,
    `${metrics.matches} ${metrics.matches === 1 ? "match" : "matches"}`,
  ];
  const figureLabel = `${metrics.docs} documents narrow to ${metrics.events} verified events, ${metrics.clusters} trajectories, and ${metrics.matches} ${metrics.matches === 1 ? "match" : "matches"}.`;
  const backtestCopy = `Trajectories are matched against the real${outcomeYear === null ? "" : ` ${outcomeYear}`} solicitations. Every source document predates its outcome; the pipeline never sees the answer it is graded on.`;

  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <h2 className="section-title">Read everything. Keep what&apos;s provable.</h2>
            <p className="section-lede">
              Four stages. Nothing appears on this page unless it survived all
              four.
            </p>
            <ol className="mt-10">
              <MethodStep
                index={1}
                title="Collect"
                body={
                  <>
                    {metrics.docs} public documents from {districts} Florida
                    districts: agendas, minutes, budgets, procurement archives.
                  </>
                }
              />
              <MethodStep
                index={2}
                title="Extract"
                body="A model pulls purchase events. The quote gate: no character-for-character sentence in the source, no event. District, date, and URL come from the source ledger, never from the model."
              />
              <MethodStep
                index={3}
                title="Link"
                body="Temporal entity resolution: events about the same initiative are linked across meetings into trajectories — the paper trail of one purchase forming over time."
              />
              <MethodStep
                index={4}
                title="Backtest"
                body={backtestCopy}
              />
            </ol>
          </div>

          <div className="self-center">
            <Funnel
              docs={metrics.docs}
              events={metrics.events}
              label={figureLabel}
              stages={stages}
            />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              The gate is strict on purpose. What survives is small, and every
              line of it can be checked.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
