import { STATE_META, VERDICT_META } from "@/components/results/meta";
import { ControlPanel } from "@/components/results/viz/control-panel";
import { ScoreScale, type ScoreRow } from "@/components/results/viz/score-scale";
import { StatStrip, type StatItem } from "@/components/results/viz/stat-strip";
import { Badge } from "@/components/ui/badge";
import {
  formatCount,
  formatDate,
  formatMoney,
  formatSimilarity,
  type CaseStudy,
  type DossierMetrics,
  type Outcome,
  type Scoreboard,
} from "@/lib/dossier";

function sameOutcome(a: Outcome, b: Outcome): boolean {
  return a.date === b.date && a.title === b.title && a.type === b.type;
}

function districtShortName(district: string): string {
  return district
    .replace(" County Public Schools", "")
    .replace(" County School District", "");
}

function verdictCopy(
  caseStudy: CaseStudy,
  matchedOutcome: Outcome | null,
): string {
  switch (caseStudy.verdict.kind) {
    case "matched":
      return `Matched · similarity ${formatSimilarity(caseStudy.verdict.similarity)} · ${caseStudy.verdict.leadDays} days before the RFP`;
    case "belowFloor":
      return matchedOutcome !== null &&
        sameOutcome(caseStudy.verdict.outcome, matchedOutcome)
        ? `Below match floor · similarity ${formatSimilarity(caseStudy.verdict.similarity)} against the same ${caseStudy.verdict.outcome.type}`
        : `Below match floor · similarity ${formatSimilarity(caseStudy.verdict.similarity)} against a later cybersecurity ${caseStudy.verdict.outcome.type}`;
    case "noOutcome":
      return `Control district, no known purchase in the searched window. ${formatCount(caseStudy.events.length, true)} extracted ${caseStudy.events.length === 1 ? "event" : "events"}, no multi-meeting trail, no alarm.`;
  }
}

function CaseCard({
  caseIndex,
  caseStudy,
  matchedOutcome,
}: {
  caseIndex: number;
  caseStudy: CaseStudy;
  matchedOutcome: Outcome | null;
}) {
  const verdictMeta = VERDICT_META[caseStudy.verdict.kind];

  return (
    <details
      name="cases"
      open={caseStudy.verdict.kind === "matched"}
      className="case-details border-t border-border"
    >
      <summary className="cursor-pointer list-none py-6 marker:hidden">
        <div className="grid gap-4 sm:grid-cols-[6rem_1fr_auto] sm:items-start">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Case {String(caseIndex + 1).padStart(2, "0")}
          </p>
          <div>
            <p className="font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
              {caseStudy.district} · {formatDate(caseStudy.firstDate)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                {caseStudy.initiative}
              </h3>
              <Badge variant="outline">{caseStudy.category}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {verdictCopy(caseStudy, matchedOutcome)}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <Badge variant="outline" className={verdictMeta.chipClass}>
              {verdictMeta.label}
            </Badge>
            <span
              className="case-chevron size-2.5 rotate-45 border-r border-b border-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </div>
      </summary>

      <div className="pb-8 sm:pl-[7.5rem]">
        <div className="space-y-8 border-l border-ng-green-300 pl-5 sm:pl-7">
          {caseStudy.events.map((event, eventIndex) => {
            const stateMeta = STATE_META[event.state];

            return (
              <article key={`${event.date}-${eventIndex}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={stateMeta.dot} aria-hidden="true" />
                  <time
                    dateTime={event.date}
                    className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground sm:text-xs"
                  >
                    {formatDate(event.date)}
                  </time>
                  <Badge className={stateMeta.badge}>{stateMeta.label}</Badge>
                </div>
                <h4 className="mt-3 text-sm font-semibold leading-6">
                  {event.action}
                </h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {event.summary}
                </p>
                <blockquote className="evidence mt-5 border-l-2 border-ng-green-400 pl-4 font-mono text-sm leading-7 text-foreground">
                  {event.evidence}
                </blockquote>

                {event.vendor !== null || event.amount !== null ? (
                  <p className="mt-4 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                    {event.vendor ?? "Vendor not listed"}
                    {event.amount === null
                      ? ""
                      : ` · ${formatMoney(event.amount)}`}
                  </p>
                ) : null}

                <div className="mt-3 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                  {event.source.isWeb ? (
                    <a
                      href={event.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-border underline-offset-4 hover:decoration-primary"
                    >
                      Open {event.source.label} source
                    </a>
                  ) : (
                    <>
                      <span>Local {event.source.label}</span>
                      <span className="mt-1 block select-all text-foreground/70">
                        {event.source.url}
                      </span>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {caseStudy.verdict.kind === "matched" ? (
          <p className="mt-6 text-sm leading-6 text-ng-green-700">
            {caseStudy.verdict.outcome.url === null ? (
              <>
                Matched eventual procurement: {caseStudy.verdict.outcome.title}
              </>
            ) : (
              <a
                href={caseStudy.verdict.outcome.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline decoration-ng-green-300 underline-offset-4 hover:decoration-ng-green-600"
              >
                Matched eventual procurement: {caseStudy.verdict.outcome.title}
              </a>
            )}
          </p>
        ) : null}
      </div>
    </details>
  );
}

export function Backtest({
  cases,
  floor,
  metrics,
  scoreboard,
}: {
  cases: CaseStudy[];
  floor: number;
  metrics: DossierMetrics;
  scoreboard: Scoreboard;
}) {
  const matchedCase = cases.find(
    (caseStudy) => caseStudy.verdict.kind === "matched",
  );
  const matchedOutcome =
    matchedCase?.verdict.kind === "matched"
      ? matchedCase.verdict.outcome
      : null;
  const nearMiss = cases.find(
    (caseStudy) =>
      caseStudy.verdict.kind === "belowFloor" &&
      matchedOutcome !== null &&
      sameOutcome(caseStudy.verdict.outcome, matchedOutcome),
  );
  const controlLabel = `${scoreboard.controls.total} control districts were checked and ${scoreboard.controls.fired} fired.`;
  const ledgerLabel = `${metrics.matches} of ${cases.length} ${cases.length === 1 ? "trajectory" : "trajectories"} cleared the ${formatSimilarity(floor)} match floor.`;
  const resultTitle = `${formatCount(metrics.matches, true)} clean ${metrics.matches === 1 ? "hit" : "hits"}. ${formatCount(scoreboard.controls.fired, true)} false alarms.`;
  const controlCaption = `${formatCount(scoreboard.controls.total, true)} districts with no known cybersecurity purchase in the searched window, run through the same pipeline. It stayed silent in all ${scoreboard.controls.total}.`;
  const nearMissCopy =
    nearMiss?.verdict.kind === "belowFloor"
      ? ` A second ${districtShortName(nearMiss.district)} signal scored ${formatSimilarity(nearMiss.verdict.similarity)} against the same ${nearMiss.verdict.outcome.type} and stayed below the floor.`
      : "";
  const ledgerCaption = `Each trajectory is scored 0 to 1 against the district's later real solicitation. ${formatCount(metrics.matches, true)} of ${formatCount(cases.length)} cleared the ${formatSimilarity(floor)} match floor.${nearMissCopy}`;
  const stats: StatItem[] = [
    {
      key: "lead",
      display: metrics.medianLeadDays === null ? "—" : String(metrics.medianLeadDays),
      countTo: metrics.medianLeadDays,
      label: "days early",
    },
    {
      key: "precision",
      display: `${metrics.precision.correct}/${metrics.precision.labeled}`,
      countTo: null,
      label: "hand-labeled precision",
    },
    {
      key: "controls",
      display: `${scoreboard.controls.fired}/${scoreboard.controls.total}`,
      countTo: null,
      label: "control districts fired",
    },
  ];
  const scoreRows: ScoreRow[] = cases.map((caseStudy) => {
    const similarity =
      caseStudy.verdict.kind === "noOutcome"
        ? null
        : caseStudy.verdict.similarity;

    return {
      id: caseStudy.id,
      matched: caseStudy.verdict.kind === "matched",
      name: `${districtShortName(caseStudy.district)} · ${caseStudy.initiative}`,
      score: similarity,
      scoreLabel:
        similarity === null
          ? "no outcome to score"
          : formatSimilarity(similarity),
    };
  });

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="section-title max-w-4xl">
          {resultTitle}
        </h2>
        <p className="section-lede">
          The outcomes were hidden from the pipeline. It read the board paper
          alone, made its calls, and was graded against the solicitations that
          actually followed.
        </p>

        <StatStrip stats={stats} />

        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <ControlPanel
              label={controlLabel}
              statusText={
                scoreboard.controls.fired === 0
                  ? `Quiet · ${scoreboard.controls.fired} alarms`
                  : `${scoreboard.controls.fired} districts fired`
              }
              total={scoreboard.controls.total}
            />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {controlCaption}
            </p>
          </div>

          <div>
            <ScoreScale
              floor={floor}
              floorLabel={formatSimilarity(floor)}
              label={ledgerLabel}
              rows={scoreRows}
            />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {ledgerCaption}
            </p>
          </div>
        </div>

        <div className="mt-20">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Case dossier
          </p>
          <div className="mt-5 border-b border-border">
            {cases.map((caseStudy, index) => (
              <CaseCard
                key={caseStudy.id}
                caseIndex={index}
                caseStudy={caseStudy}
                matchedOutcome={matchedOutcome}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
