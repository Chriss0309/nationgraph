import { IconDatabaseOff } from "@tabler/icons-react";

import { Backtest } from "@/components/results/backtest";
import { ExhibitA } from "@/components/results/exhibit-card";
import { Hero } from "@/components/results/hero";
import { Lessons } from "@/components/results/lessons";
import { Limitation } from "@/components/results/limitation";
import { Method } from "@/components/results/method";
import { Receipt } from "@/components/results/receipt";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { loadDossier } from "@/lib/dossier";

export default function Home() {
  const dossier = loadDossier();
  const outcomeYear =
    dossier.hit?.verdict.outcome.date.slice(0, 4) ?? null;

  return (
    <>
      <main>
        <Hero
          docs={dossier.metrics.docs}
          hit={dossier.hit}
          medianLeadDays={dossier.metrics.medianLeadDays}
        />
        <ExhibitA hit={dossier.hit} />
        <Method
          metrics={dossier.metrics}
          outcomeYear={outcomeYear}
          scoreboard={dossier.scoreboard}
        />

        {dossier.cases.length === 0 ? (
          <section className="border-b border-border bg-card">
            <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
              <Empty className="rounded-none border-y border-solid py-16">
                <EmptyHeader>
                  <EmptyMedia
                    variant="icon"
                    className="bg-secondary text-primary"
                  >
                    <IconDatabaseOff />
                  </EmptyMedia>
                  <EmptyTitle className="text-lg">
                    No verified trajectories are loaded
                  </EmptyTitle>
                  <EmptyDescription className="text-sm">
                    {dossier.metrics.docs === 0
                      ? "The source ledger is empty, so there is no upstream evidence to display or evaluate."
                      : `${dossier.metrics.docs} source documents were processed, but no linked trajectory met the current evidence criteria.`}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className="rounded-lg bg-muted px-4 py-3 text-left font-mono text-xs leading-6 text-muted-foreground">
                    <p>
                      Add records to <code>data/sources.csv</code> and known
                      outcomes to <code>data/outcomes.csv</code>.
                    </p>
                    <p className="mt-2">
                      Then run <code>uv run trajectory.py all</code> to generate
                      the evidence files in <code>out/</code>.
                    </p>
                  </div>
                </EmptyContent>
              </Empty>
            </div>
          </section>
        ) : (
          <Backtest
            cases={dossier.cases}
            floor={dossier.metrics.matchFloor}
            metrics={dossier.metrics}
            scoreboard={dossier.scoreboard}
          />
        )}

        <Limitation
          coverage={dossier.metrics.coverage}
          hit={dossier.hit}
          precision={dossier.metrics.precision}
        />
        <Lessons metrics={dossier.metrics} />
      </main>
      <Receipt metrics={dossier.metrics} />
    </>
  );
}
