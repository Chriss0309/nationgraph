import {
  formatPercent,
  formatSimilarity,
  type DossierMetrics,
} from "@/lib/dossier";

export function Receipt({ metrics }: { metrics: DossierMetrics }) {
  const countLine = `${metrics.docs} documents · ${metrics.events} events · ${metrics.clusters} trajectories · ${metrics.matches} ${metrics.matches === 1 ? "match" : "matches"}`;
  const medianLead =
    metrics.medianLeadDays === null
      ? "not established"
      : `${metrics.medianLeadDays} days`;
  const resultLine = `coverage ${metrics.coverage.covered}/${metrics.coverage.total} (${formatPercent(metrics.coverage.rate)}) · median lead ${medianLead} · control false alarms ${metrics.controls.fired}/${metrics.controls.total} · precision ${metrics.precision.correct}/${metrics.precision.labeled}`;
  const thresholdLine = `link threshold ${formatSimilarity(metrics.linkThreshold)} · match floor ${formatSimilarity(metrics.matchFloor)}`;

  return (
    <footer className="bg-card">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="border-t border-border pt-6 font-mono text-[10px] leading-6 text-muted-foreground sm:text-xs">
          <p>{countLine}</p>
          <p>{resultLine}</p>
          <p>{thresholdLine}</p>
          <p className="mt-4 text-foreground">
            Built by Christopher Ooi to show, not tell, my interest in joining
            NationGraph&apos;s engineering team.
          </p>
          <p>
            <a
              href="mailto:ooichristopher8@gmail.com"
              className="underline decoration-border underline-offset-4 hover:decoration-primary"
            >
              ooichristopher8@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
