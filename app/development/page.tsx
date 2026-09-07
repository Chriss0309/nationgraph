import type { Metadata } from "next";
import Link from "next/link";
import { IconDatabaseOff } from "@tabler/icons-react";

import { Backtest } from "@/components/results/backtest";
import { ExhibitA } from "@/components/results/exhibit-card";
import { Hero } from "@/components/results/hero";
import { Lessons } from "@/components/results/lessons";
import { Limitation } from "@/components/results/limitation";
import { Method } from "@/components/results/method";
import { Receipt } from "@/components/results/receipt";
import { SiteHeader } from "@/components/site-header";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireDossier } from "@/lib/dossier";

export const metadata: Metadata = {
  title: "Development record · demograph",
  description: "The hand-built development corpus: 8 districts, 124 documents, and the receipt the thresholds were frozen on.",
};

export default function DevelopmentPage() {
  const dossier = requireDossier("development");
  const outcomeYear =
    dossier.hit?.verdict.outcome.date.slice(0, 4) ?? null;

  return (
    <>
      <SiteHeader current="development" />
      <main>
        <section className="border-b border-border bg-card">
          <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">Record</p>
            <ul className="mt-2 max-w-2xl space-y-1 text-sm leading-6">
              <li>
                Before the holdout test, the unseen test set, I tuned the settings on a small set I built by hand. It holds 8 districts, 124 documents, 4 events, and 4 trajectories. Events and trajectories are{" "}
                <Link href="/holdout" className="underline decoration-border underline-offset-4 hover:decoration-primary">defined on the holdout page</Link>.
              </li>
              <li>
                On that set: coverage 1 of 5, median lead 317 days from one hit, control alarms 0 of 3, precision 1 of 1. These numbers are not evidence; the settings were tuned on them. Kept as a record.{" "}
                <Link href="/holdout" className="underline decoration-border underline-offset-4 hover:decoration-primary">The holdout is the result.</Link>
              </li>
            </ul>
          </div>
        </section>
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
