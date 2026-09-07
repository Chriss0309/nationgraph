import type { Metadata } from "next";
import Link from "next/link";

import { LeadRuler } from "@/components/results/lead-ruler";
import { STATE_META } from "@/components/results/meta";
import { Receipt } from "@/components/results/receipt";
import { SiteHeader } from "@/components/site-header";
import { Tiles, type Tile } from "@/components/tiles";
import {
  formatDate,
  formatSimilarity,
  loadDossier,
  requireDossier,
  type CaseStudy,
  type IsoDate,
} from "@/lib/dossier";
import {
  caseLabel,
  holdoutCases,
  holdoutLedger,
  holdoutPairs,
  pipelineStats,
  type CaseRow,
  type RunStats,
} from "@/lib/ledgers";

export const metadata: Metadata = {
  title: "Holdout test · demograph",
  description: "17 unseen cases and 17 controls, settings frozen first, every packet read, every case shown with its verdict.",
};

const linkClass = "underline decoration-border underline-offset-4 hover:decoration-primary";

interface CaseSummary {
  row: CaseRow;
  label: string;
  packets: number;
  events: number;
  meetings: number;
  trajectories: CaseStudy[];
  best: CaseStudy | null;
}

function fyOf(row: CaseRow): string {
  return row.case_id.split("fy").at(-1) ?? "";
}

function verdictText(summary: CaseSummary, floor: number): string {
  const { row, trajectories, best } = summary;
  if (row.research_status !== "complete") return "excluded: too few packets in window";
  if (row.role === "control") {
    const fired = trajectories.filter((trajectory) => trajectory.events.length >= 2);
    if (fired.length > 0) {
      const meetings = new Set(fired.flatMap((trajectory) => trajectory.events.map((event) => event.date))).size;
      return `alarm: ${fired.length} multi-event ${fired.length === 1 ? "trajectory" : "trajectories"}, ${meetings} ${meetings === 1 ? "meeting" : "meetings"}`;
    }
    return trajectories.length > 0 ? `quiet: ${trajectories.length} single ${trajectories.length === 1 ? "event" : "events"}, no alarm` : "quiet: no events";
  }
  if (best === null) return trajectories.length === 0 ? "missed: no events extracted" : "missed: no trajectory scored";
  if (best.verdict.kind === "matched") return `covered: score ${formatSimilarity(best.verdict.similarity)}, ${best.verdict.leadDays} days early`;
  if (best.verdict.kind === "belowFloor") return `missed: best score ${formatSimilarity(best.verdict.similarity)}, floor ${floor.toFixed(2)}`;
  return "missed";
}

function EventList({ trajectory }: { trajectory: CaseStudy }) {
  return (
    <ol className="mt-2 space-y-2 border-l border-border pl-3">
      {trajectory.events.map((event, index) => {
        const meta = STATE_META[event.state];
        return (
          <li key={`${event.date}-${index}`} className="text-sm leading-6">
            <span className="font-mono text-[10px] text-muted-foreground sm:text-xs">{formatDate(event.date)}</span>{" "}
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${meta.badge}`}>{meta.label}</span>{" "}
            {event.action}
            <blockquote className="mt-1 border-l-2 border-ng-green-300 pl-3 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
              {event.evidence}
            </blockquote>
            {event.source.isWeb ? (
              <a href={event.source.url} target="_blank" rel="noreferrer" className={`font-mono text-[10px] sm:text-xs ${linkClass}`}>
                packet
              </a>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function RunReceipt({ name, run }: { name: string; run: RunStats }) {
  return (
    <div className="rounded-md border border-border bg-background p-4 font-mono text-[10px] leading-6 sm:text-xs">
      <p className="uppercase tracking-[0.14em] text-muted-foreground">{name} run</p>
      <p>{run.unique_packets.toLocaleString()} packets · {run.failed} failed · {run.short} under 500 characters</p>
      <p>{run.chars.toLocaleString()} characters of board text</p>
      <p>{run.keyword_relevant.toLocaleString()} packets passed the keyword gate and reached the model</p>
      <p>{run.clipped_chars.toLocaleString()} characters sent, about {run.approx_input_tokens.toLocaleString()} input tokens</p>
    </div>
  );
}

export default function HoldoutPage() {
  const holdout = loadDossier("holdout");
  const development = requireDossier("development");
  const cases = holdoutCases() ?? [];
  const ledger = holdoutLedger() ?? [];
  const pairs = holdoutPairs() ?? [];
  const stats = pipelineStats();
  const floor = holdout?.metrics.matchFloor ?? development.metrics.matchFloor;
  const linkThreshold = holdout?.metrics.linkThreshold ?? development.metrics.linkThreshold;

  const packetsByLabel = new Map<string, number>();
  for (const row of ledger) {
    if (row.status.startsWith("failed")) continue;
    packetsByLabel.set(row.district, (packetsByLabel.get(row.district) ?? 0) + 1);
  }
  const trajectoriesByLabel = new Map<string, CaseStudy[]>();
  for (const trajectory of holdout?.cases ?? []) {
    const list = trajectoriesByLabel.get(trajectory.district) ?? [];
    list.push(trajectory);
    trajectoriesByLabel.set(trajectory.district, list);
  }
  const caseNames = new Map(cases.map((row) => [row.case_id, `${row.district} FY${fyOf(row)}`]));

  const summaries: CaseSummary[] = cases
    .map((row) => {
      const label = caseLabel(row);
      const trajectories = trajectoriesByLabel.get(label) ?? [];
      const best =
        trajectories
          .filter((trajectory) => trajectory.verdict.kind !== "noOutcome")
          .toSorted((a, b) => {
            const sa = a.verdict.kind === "noOutcome" ? -1 : a.verdict.similarity;
            const sb = b.verdict.kind === "noOutcome" ? -1 : b.verdict.similarity;
            return sb - sa;
          })[0] ?? null;
      return {
        row,
        label,
        packets: packetsByLabel.get(label) ?? 0,
        events: trajectories.reduce((total, trajectory) => total + trajectory.events.length, 0),
        meetings: new Set(trajectories.flatMap((trajectory) => trajectory.events.map((event) => event.date))).size,
        trajectories,
        best,
      };
    })
    .toSorted(
      (a, b) =>
        Number(a.row.role === "control") - Number(b.row.role === "control") ||
        a.row.index_date.localeCompare(b.row.index_date) ||
        a.row.district.localeCompare(b.row.district),
    );

  const alarms = summaries.filter((summary) => summary.row.role === "control" && summary.trajectories.some((trajectory) => trajectory.events.length >= 2));
  const unlabeled = pairs.filter((pair) => pair.matched === "True" && !["correct", "incorrect"].includes(pair.label.trim().toLowerCase()));
  const crossMeeting = (holdout?.cases ?? []).filter((trajectory) => new Set(trajectory.events.map((event) => event.date)).size >= 2).length;
  const positives = cases.filter((row) => row.role === "positive" && row.research_status === "complete");
  const controls = cases.filter((row) => row.role === "control");
  const packetCounts = summaries.map((summary) => summary.packets).filter((count) => count > 0);
  const hit = holdout?.hit ?? null;
  const alarm = alarms[0] ?? null;
  const alarmTrajectory = alarm?.trajectories.find((trajectory) => trajectory.events.length >= 2) ?? null;

  const tiles: Tile[] | null = holdout
    ? [
        { label: "Coverage", value: `${holdout.metrics.coverage.covered} of ${holdout.metrics.coverage.total}`, note: "The share of known filings the pipeline saw coming. One of 17 E-rate firewall filings had a matching board event first." },
        { label: "Median lead", value: holdout.metrics.medianLeadDays === null ? "none" : `${holdout.metrics.medianLeadDays} days`, note: "The gap between the board event and the filing. One covered filing, so the median is that one number." },
        { label: "Control alarms", value: `${holdout.metrics.controls.fired} of ${holdout.metrics.controls.total}`, note: "A control is a case with no firewall filing. Jefferson still produced a two-event trajectory, on a Fortinet purchase made outside E-rate." },
        { label: "Precision", value: holdout.metrics.precision.labeled === 0 ? "pending" : `${holdout.metrics.precision.correct} of ${holdout.metrics.precision.labeled}`, note: holdout.metrics.precision.labeled === 0 ? "The share of matches a person confirms as right. The one match has not been checked yet." : "The share of matches a person confirmed as right." },
        { label: "Cross-meeting links", value: `${crossMeeting} of ${holdout.metrics.clusters}`, note: "Trajectories that span two or more meetings. None in this run." },
      ]
    : null;

  return (
    <>
      <SiteHeader current="holdout" />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">The result</p>
            <h1 className="section-title">Holdout test</h1>
            <ul className="mt-6 max-w-2xl space-y-1 text-base leading-7">
              <li>A holdout is a set of test cases I never looked at while building. The outcomes are E-rate firewall filings. E-rate is the federal school internet discount.</li>
              <li>A packet is what a school board posts before it meets. An event is one purchase step the model found in a packet. A trajectory is one district&apos;s events that look like one purchase.</li>
            </ul>
            {tiles ? (
              <>
                <div className="mt-8">
                  <Tiles tiles={tiles} columns={5} />
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  The development set is the small hand-built set I froze the settings on. There: coverage {development.metrics.coverage.covered} of {development.metrics.coverage.total}, median lead {development.metrics.medianLeadDays ?? "none"} days, control alarms {development.metrics.controls.fired} of {development.metrics.controls.total}, precision {development.metrics.precision.correct} of {development.metrics.precision.labeled}.{" "}
                  <Link href="/development" className={linkClass}>Development record</Link>
                </p>
                <p className="mt-6 font-heading text-2xl font-semibold tracking-tight">A weak result.</p>
              </>
            ) : (
              <div className="mt-8 rounded-md border border-border bg-card p-5 font-mono text-[10px] leading-6 text-muted-foreground sm:text-xs">
                <p>The ledger holds {positives.length} positive and {controls.length} control cases. The model run has not been committed yet.</p>
              </div>
            )}
          </div>
        </section>

        <section className="border-b border-border bg-card">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 className="figure-title">The test</h2>
            <ul className="mt-4 max-w-2xl space-y-1 text-base leading-7">
              <li>This test was pre-registered: I fixed the cases and settings before the answers were known. Nothing hand picked.</li>
              <li>Frozen settings: the second draft of the extraction prompt, a link threshold of {linkThreshold.toFixed(2)}, and a match floor of {floor.toFixed(2)}. The two numbers are defined below, under The one hit and Pipeline.</li>
              <li>Outcomes are E-rate firewall filings, Form 470, the form a district files to ask for bids. They come from the public data of USAC, the agency that runs E-rate, for funding years 2023 to 2026. The filing is the solicitation, the public call for bids.</li>
              <li>{positives.length} positive cases. Each is a district plus funding year, with an 18-month window ending the day before the filing.</li>
              <li>{controls.length} controls, one per positive. Each is a district plus funding year with no firewall filing in the window or the year after.</li>
              {packetCounts.length > 0 ? (
                <li>
                  {packetCounts.reduce((total, count) => total + count, 0).toLocaleString()} packet reads, {Math.min(...packetCounts)} to {Math.max(...packetCounts)} per case.
                </li>
              ) : null}
            </ul>
          </div>
        </section>

        {hit ? (
          <section className="border-b border-border">
            <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
              <h2 className="figure-title">Lead time</h2>
              <ul className="mt-2 max-w-2xl space-y-1 text-sm leading-6 text-muted-foreground">
                <li>One covered filing: {hit.district.split(" | ")[0]}, FY{hit.district.split("FY ").at(-1)}.</li>
                <li>The window is 18 months ending the day before the filing. The signal sits {hit.verdict.leadDays} days before it.</li>
              </ul>
              <div className="mt-4 max-w-3xl rounded-md border border-border bg-card p-5">
                <LeadRuler hit={{ ...hit, district: hit.district.split(" | ")[0] }} />
              </div>
            </div>
          </section>
        ) : null}

        {hit || alarmTrajectory ? (
          <section className="border-b border-border bg-card">
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2">
              {hit ? (
                <div className="rounded-md border border-border bg-background p-5">
                  <h2 className="figure-title">The one hit</h2>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                    <li>{hit.district.split(" | ")[0]}, positive, FY{hit.district.split("FY ").at(-1)}.</li>
                    <li>
                      A {formatDate(hit.events[0].date)} E-rate authorization matched the {formatDate(hit.verdict.outcome.date)} filing at {formatSimilarity(hit.verdict.similarity)}, {hit.verdict.leadDays} days early.
                    </li>
                    <li>
                      The {formatSimilarity(hit.verdict.similarity)} is the match score between the trajectory and the filing. The floor is {floor.toFixed(2)}, so the hit cleared it by {formatSimilarity(hit.verdict.similarity - floor)}.
                    </li>
                    <li>Its near-identical February 2024 E-rate request scored 0.43 against the 2025 filing and missed.</li>
                  </ul>
                  <EventList trajectory={hit} />
                  {hit.verdict.outcome.url ? (
                    <p className="mt-3 font-mono text-[10px] sm:text-xs">
                      <a href={hit.verdict.outcome.url} target="_blank" rel="noreferrer" className={linkClass}>
                        the filing
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}
              {alarm && alarmTrajectory ? (
                <div className="rounded-md border border-border bg-background p-5">
                  <h2 className="figure-title">The one alarm</h2>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                    <li>{alarm.row.district}, control.</li>
                    <li>
                      {alarmTrajectory.events.length} agenda items from {new Set(alarmTrajectory.events.map((event) => event.date)).size === 1 ? "one" : "more than one"} meeting approved Fortinet firewall hardware and support.
                    </li>
                    <li>A purchase the board did make, outside E-rate. I picked controls by E-rate filings alone, so it counts as an alarm.</li>
                  </ul>
                  <EventList trajectory={alarmTrajectory} />
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 className="figure-title">Every case</h2>
            <ul className="mt-2 max-w-2xl space-y-1 text-sm leading-6 text-muted-foreground">
              <li>{positives.length} positives and {controls.length} controls in one table, one verdict per row.</li>
              <li>A positive is covered when a trajectory that starts before the filing scores at least {floor.toFixed(2)} against it.</li>
              <li>A control raises an alarm when the link step joins two or more events into one trajectory. The events can come from one meeting or several. The table shows the meeting count so you can tell the two apart.</li>
              {holdout ? (
                <li>
                  {holdout.metrics.events} events passed the grounding step and formed {holdout.metrics.clusters} trajectories, {crossMeeting} spanning two or more meetings.
                </li>
              ) : null}
            </ul>
            {summaries.length === 0 ? (
              <p className="mt-4 font-mono text-[10px] text-muted-foreground sm:text-xs">No cases yet.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Case</th>
                      <th className="py-2 pr-4 font-medium">Role</th>
                      <th className="py-2 pr-4 font-medium">Window</th>
                      <th className="py-2 pr-4 font-medium">Packets</th>
                      <th className="py-2 pr-4 font-medium">Events</th>
                      <th className="py-2 pr-4 font-medium">Verdict</th>
                      <th className="py-2 font-medium">Filing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={summary.row.case_id} id={summary.row.case_id} className="border-b border-border align-top font-mono text-[10px] leading-5 sm:text-xs">
                        <td className="py-2 pr-4 text-foreground">
                          {summary.row.district}
                          <span className="text-muted-foreground"> FY{fyOf(summary.row)}</span>
                          {summary.row.role === "control" ? (
                            <p className="text-muted-foreground">control for {caseNames.get(summary.row.matched_case_id) ?? summary.row.matched_case_id}</p>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4">{summary.row.role}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {formatDate(summary.row.window_start as IsoDate)} to {formatDate(summary.row.window_end as IsoDate)}
                        </td>
                        <td className="py-2 pr-4">{summary.packets}</td>
                        <td className="py-2 pr-4">
                          {summary.events} in {summary.trajectories.length} {summary.trajectories.length === 1 ? "trajectory" : "trajectories"}
                          {summary.events > 0 ? `, ${summary.meetings} ${summary.meetings === 1 ? "meeting" : "meetings"}` : ""}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={summary.best?.verdict.kind === "matched" ? "text-ng-green-700" : "text-muted-foreground"}>
                            {holdout === null && summary.row.research_status === "complete" ? "not run" : verdictText(summary, floor)}
                          </span>
                          {summary.best ? (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-muted-foreground">
                                {summary.best.initiative || "Unnamed"} · {summary.best.events.length} {summary.best.events.length === 1 ? "event" : "events"}
                              </summary>
                              <EventList trajectory={summary.best} />
                            </details>
                          ) : null}
                        </td>
                        <td className="py-2">
                          {summary.row.role === "positive" ? (
                            <a href={summary.row.outcome_url} target="_blank" rel="noreferrer" className={linkClass}>
                              Form 470 · {formatDate(summary.row.index_date as IsoDate)}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">none in window</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section id="pipeline" className="border-b border-border bg-card">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 className="figure-title">Pipeline</h2>
            <ol className="mt-4 max-w-2xl list-decimal space-y-2 pl-5 text-sm leading-6">
              <li>
                <strong>Fetch.</strong> Pull the packets in each case window from the crawl. {stats?.runs.holdout ? `${stats.runs.holdout.unique_packets.toLocaleString()} in this run.` : ""}
              </li>
              <li>
                <strong>Extract.</strong> A keyword filter passes packets that mention security or network terms. {stats?.runs.holdout ? `${stats.runs.holdout.keyword_relevant.toLocaleString()} of ${stats.runs.holdout.unique_packets.toLocaleString()} reached the model, which` : "The model"} proposes events, each with a quote.
              </li>
              <li>
                <strong>Ground.</strong> Keep an event only if its quote is in the packet word for word. Any vendor or dollar amount must be in the text too.
              </li>
              <li>
                <strong>Link.</strong> Each event gets a short text signature. Events from one district join a trajectory when the signature scores at least {linkThreshold.toFixed(2)} against its last three events. The score is embedding similarity: a language model turns each text into a list of numbers, and the score is how close the two lists are. Add 0.08 for a shared category and 0.08 for a shared vendor.{" "}
                <Link href="/board#linking" className={linkClass}>The board page defines it in full.</Link>
              </li>
              <li>
                <strong>Evaluate.</strong> Score each trajectory against the filing. Covered at {floor.toFixed(2)} or above.
              </li>
            </ol>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">The board run used the same frozen code and settings. The site reads every count from committed output files at build time.</p>
            {stats ? (
              <div id="receipt" className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-md border border-border bg-background p-4 font-mono text-[10px] leading-6 sm:text-xs">
                  <p className="uppercase tracking-[0.14em] text-muted-foreground">Registry</p>
                  <p>{stats.districts.total} Florida districts</p>
                  <p>{stats.districts.boarddocs ?? 0} on BoardDocs, a common agenda website, and crawled</p>
                  <p>{stats.districts.other ?? 0} on another portal · {stats.districts.unknown ?? 0} unknown</p>
                  <p>{stats.meetings.toLocaleString()} meetings indexed{stats.meetings_span ? ` (${stats.meetings_span[0]} to ${stats.meetings_span[1]})` : ""}</p>
                  <p className="text-muted-foreground">generated {stats.generated}</p>
                </div>
                {stats.runs.holdout ? <RunReceipt name="Holdout" run={stats.runs.holdout} /> : null}
                {stats.runs.board ? <RunReceipt name="Board" run={stats.runs.board} /> : null}
              </div>
            ) : null}
            {unlabeled.length > 0 ? (
              <p className="mt-4 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                Precision is the one number a person sets: {unlabeled.length} matched {unlabeled.length === 1 ? "pair" : "pairs"} still unlabeled in out-holdout/linked_pairs.csv.
              </p>
            ) : null}
          </div>
        </section>

        <section id="lessons" className="border-b border-border">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 className="figure-title">Lessons</h2>
            <ol className="mt-4 max-w-2xl list-decimal space-y-5 pl-5">
              <li>
                <p className="font-heading text-lg font-semibold tracking-tight">Renewals skip the board.</p>
                <p className="text-sm leading-6 text-muted-foreground">My read: most E-rate firewall filings are annual renewals that never reach the board as their own item. 4 positive cases produced no event in 26 to 74 packets. The rest produced events about other purchases.</p>
              </li>
              <li>
                <p className="font-heading text-lg font-semibold tracking-tight">The match floor is brittle.</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Indian River&apos;s March 2022 authorization hit at 0.53. Its near-identical February 2024 E-rate request scored 0.43 against the 2025 filing and missed.{" "}
                  <a href="#school_district_of_indian_river_county_fy2023" className={linkClass}>The row</a>
                </p>
              </li>
              <li>
                <p className="font-heading text-lg font-semibold tracking-tight">One word split a real pair.</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Walton discussed on Jun 18, 2024 and approved on Jun 27. The one real discussion-to-approval pair scored 0.777, just under the {linkThreshold.toFixed(2)} link threshold. The model labeled the category cybersecurity solution once and cybersecurity service once. Had the labels matched, the 0.08 category bonus would have linked them at 0.857.{" "}
                  <Link href="/board#linking" className={linkClass}>How events link</Link>
                </p>
              </li>
              <li>
                <p className="font-heading text-lg font-semibold tracking-tight">The alarm was a purchase, and a loose link.</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Jefferson&apos;s board approved a Fortinet firewall outside E-rate, so picking controls by E-rate filings alone counts it. The second event in that trajectory is support for switches and phones, a different purchase the linker joined anyway.{" "}
                  {alarm ? <a href={`#${alarm.row.case_id}`} className={linkClass}>The row</a> : null}
                </p>
              </li>
              <li>
                <p className="font-heading text-lg font-semibold tracking-tight">Approvals, not deliberations.</p>
                <p className="text-sm leading-6 text-muted-foreground">Boards publish the vote, rarely the debate before it. Of the 52 events in the board run, the current 18-month window, 25 are authorizations and 21 are renewals.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="border-b border-border bg-card">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 className="figure-title">Next</h2>
            <ul className="mt-4 max-w-2xl list-disc space-y-1 pl-5 text-sm leading-6">
              <li>Map category labels to one fixed list before scoring, so solution and service count as the same.</li>
              <li>Add outcome sources beyond E-rate.</li>
              <li>Hand-check the one match, Indian River, and settle precision.</li>
              <li>Expect little from renewals. The pre-solicitation window is mostly invisible for them.</li>
            </ul>
            <p className="mt-8 max-w-2xl font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Everyone in this space reads documents well now. Nobody models time and structure. That&apos;s where I&apos;d work.
            </p>
            <p className="mt-4 font-mono text-[10px] sm:text-xs">
              <a href="https://github.com/Chriss0309/nationgraph/blob/main/trajectory.py" className={linkClass}>
                The frozen pipeline, trajectory.py
              </a>
            </p>
          </div>
        </section>
      </main>
      <Receipt metrics={development.metrics} />
    </>
  );
}
