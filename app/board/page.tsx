import type { Metadata } from "next";
import Link from "next/link";

import { STATE_META } from "@/components/results/meta";
import { Receipt } from "@/components/results/receipt";
import { SiteHeader } from "@/components/site-header";
import {
  formatDate,
  formatMoney,
  loadDossier,
  requireDossier,
  type CaseStudy,
  type EventState,
  type SignalEvent,
} from "@/lib/dossier";
import { boardLedger, districts, pipelineStats } from "@/lib/ledgers";

export const metadata: Metadata = {
  title: "Signal board · demograph",
  description: "Every purchase event found in 18 months of packets from 45 Florida school districts, ranked by stage and linked to its source.",
};

const STAGE_RANK: Record<EventState, number> = {
  AWARD: 7,
  SOLICITATION: 6,
  AUTHORIZATION: 5,
  BUDGET: 4,
  RENEWAL: 4,
  WORKSHOP: 3,
  DISCUSSION: 2,
  OTHER: 1,
};

const STAGE_DEFINITION: Record<EventState, string> = {
  AWARD: "A vendor was chosen.",
  SOLICITATION: "The public call for bids went out.",
  AUTHORIZATION: "The board approved spending or a contract.",
  BUDGET: "Money was set aside.",
  RENEWAL: "An existing contract was extended.",
  WORKSHOP: "A planning session, no vote.",
  DISCUSSION: "The board talked about it, no action.",
  OTHER: "None of the above.",
};

const PINNED = ["Charlotte County Public Schools", "St. Lucie Public Schools", "School Board of Highlands County", "Flagler Schools"];
const linkClass = "underline decoration-border underline-offset-4 hover:decoration-primary";

interface BoardRow {
  trajectory: CaseStudy;
  latest: SignalEvent;
  rank: number;
}

function Stage({ state }: { state: EventState }) {
  const meta = STATE_META[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] ${meta.badge}`}>
      <span className={meta.dot} />
      {meta.label}
    </span>
  );
}

function meetingsLabel(trajectory: CaseStudy): string {
  const meetings = new Set(trajectory.events.map((event) => event.date)).size;
  const extra = trajectory.events.length > meetings ? ` · ${trajectory.events.length} events` : "";
  return `${meetings} ${meetings === 1 ? "meeting" : "meetings"}${extra}`;
}

export default function BoardPage() {
  const board = loadDossier("board");
  const development = requireDossier("development");
  const stats = pipelineStats();
  const ledger = boardLedger() ?? [];
  const registry = districts();
  const crawled = registry.filter((row) => row.boarddocs_site.trim().length > 0);

  const packetsByDistrict = new Map<string, number>();
  for (const row of ledger) {
    if (row.status.startsWith("failed")) continue;
    packetsByDistrict.set(row.district, (packetsByDistrict.get(row.district) ?? 0) + 1);
  }

  const rows: BoardRow[] = (board?.cases ?? [])
    .map((trajectory) => ({
      trajectory,
      latest: trajectory.events[trajectory.events.length - 1],
      rank: Math.max(...trajectory.events.map((event) => STAGE_RANK[event.state])),
    }))
    .toSorted((a, b) => b.rank - a.rank || b.latest.date.localeCompare(a.latest.date) || a.trajectory.district.localeCompare(b.trajectory.district));
  const active = new Set(rows.map((row) => row.trajectory.district));
  const quiet = crawled
    .filter((row) => !active.has(row.district))
    .map((row) => ({ district: row.district, packets: packetsByDistrict.get(row.district) ?? 0 }))
    .toSorted((a, b) => b.packets - a.packets || a.district.localeCompare(b.district));
  const uncrawled = registry.filter((row) => row.boarddocs_site.trim().length === 0);
  const pinned = PINNED.map((district) =>
    rows
      .filter((row) => row.trajectory.district === district)
      .toSorted((a, b) => (b.latest.amount ?? 0) - (a.latest.amount ?? 0))[0],
  ).filter((row): row is BoardRow => row !== undefined);
  const states = new Map<EventState, number>();
  for (const row of rows) for (const event of row.trajectory.events) states.set(event.state, (states.get(event.state) ?? 0) + 1);
  const events = board?.metrics.events ?? 0;
  const boardRun = stats?.runs.board;

  return (
    <>
      <SiteHeader current="board" />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">The feature</p>
            <h1 className="section-title">Signal board</h1>
            <ul className="mt-6 max-w-2xl space-y-1 text-base leading-7">
              <li>A packet is what a school board posts before it meets.</li>
              <li>An event is one purchase step the model found in a packet, with a quote.</li>
              <li>Grounded means the quote appears in the packet word for word.</li>
              <li>A trajectory is one district&apos;s events that look like one purchase.</li>
            </ul>
            {board ? (
              <ul className="mt-6 max-w-2xl space-y-1 text-base leading-7">
                <li>Every trajectory the pipeline found in packets from Mar 7, 2025 to Sep 3, 2026. Same code and settings as the holdout test, the unseen test set on the Holdout page, fixed before either run.</li>
                <li>
                  {crawled.length} districts, {(boardRun?.unique_packets ?? ledger.length).toLocaleString()} packets, {events} grounded events, {board.metrics.clusters} trajectories, {active.size} districts with at least one event.
                </li>
                <li>
                  Of the {events} events, {states.get("AUTHORIZATION") ?? 0} are authorizations and {states.get("RENEWAL") ?? 0} are renewals.
                </li>
                <li>An outcome is an E-rate firewall filing to score against. E-rate is the federal school internet discount. This run attaches none, so nothing here is scored. The holdout test does the scoring.</li>
              </ul>
            ) : (
              <p className="mt-6 font-mono text-[10px] text-muted-foreground sm:text-xs">The board run has not been committed yet.</p>
            )}
          </div>
        </section>

        {pinned.length > 0 ? (
          <section className="border-b border-border bg-card">
            <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
              <h2 className="figure-title">Start with these four, picked by hand</h2>
              <ol className="mt-4 grid gap-4 lg:grid-cols-2">
                {pinned.map(({ trajectory, latest }) => (
                  <li key={trajectory.id} className="rounded-md border border-border bg-background p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {trajectory.district} · {formatDate(latest.date)}
                    </p>
                    <p className="mt-1 text-base leading-7">
                      <Stage state={latest.state} /> {latest.action || latest.summary}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground sm:text-xs">
                      {latest.vendor ?? "vendor not in text"}
                      {latest.amount !== null ? ` · ${formatMoney(latest.amount)}` : ""} · {meetingsLabel(trajectory)}
                    </p>
                    <blockquote className="mt-2 border-l-2 border-ng-green-300 pl-3 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                      {latest.evidence}
                    </blockquote>
                    {latest.source.isWeb ? (
                      <p className="mt-2 font-mono text-[10px] sm:text-xs">
                        <a href={latest.source.url} target="_blank" rel="noreferrer" className={linkClass}>
                          packet
                        </a>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Charlotte&apos;s firewall contract has no E-rate filing yet. E-rate is the federal school internet discount, and its filings are the outcomes I check against. Read the quote, then judge the call.
              </p>
            </div>
          </section>
        ) : null}

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 className="figure-title">Every trajectory</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Ranked by the furthest stage a trajectory reached: award, solicitation, authorization, budget or renewal, workshop, discussion, other. The badge shows its latest event. A solicitation is the public call for bids. Each stage is defined under How to read a row.
            </p>
            {rows.length === 0 ? (
              <p className="mt-6 font-mono text-[10px] text-muted-foreground sm:text-xs">No trajectories committed yet.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">District</th>
                      <th className="py-2 pr-4 font-medium">Stage</th>
                      <th className="py-2 pr-4 font-medium">Purchase</th>
                      <th className="py-2 pr-4 font-medium">Path</th>
                      <th className="py-2 pr-4 font-medium">Latest quote</th>
                      <th className="py-2 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ trajectory, latest }) => (
                      <tr key={trajectory.id} id={trajectory.id} className="border-b border-border align-top">
                        <td className="py-3 pr-4 font-medium">{trajectory.district}</td>
                        <td className="py-3 pr-4">
                          <Stage state={latest.state} />
                        </td>
                        <td className="py-3 pr-4">
                          <p>{trajectory.initiative || "Unnamed"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {trajectory.category || "no category"}
                            {latest.vendor ? ` · ${latest.vendor}` : ""}
                            {latest.amount !== null ? ` · ${formatMoney(latest.amount)}` : ""}
                          </p>
                        </td>
                        <td className="py-3 pr-4 font-mono text-[10px] leading-5 text-muted-foreground">
                          {trajectory.events.map((event, index) => (
                            <span key={`${event.date}-${index}`}>
                              {index > 0 ? " → " : ""}
                              {STATE_META[event.state].label} {formatDate(event.date).replace(/, \d{4}$/, "")}
                            </span>
                          ))}
                          <p>{meetingsLabel(trajectory)}</p>
                        </td>
                        <td className="max-w-md py-3 pr-4">
                          <details>
                            <summary className="cursor-pointer text-sm">{latest.action || latest.summary}</summary>
                            <blockquote className="mt-2 border-l-2 border-ng-green-300 pl-3 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                              {latest.evidence}
                            </blockquote>
                          </details>
                        </td>
                        <td className="py-3 font-mono text-[10px] leading-5 sm:text-xs">
                          {latest.source.isWeb ? (
                            <a href={latest.source.url} target="_blank" rel="noreferrer" className={linkClass}>
                              packet · {formatDate(latest.date)}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">{latest.source.label}</span>
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

        <section className="border-b border-border bg-card">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2">
            <div>
              <h2 className="figure-title">Quiet districts</h2>
              <ul className="mt-2 max-w-xl space-y-1 text-sm leading-6 text-muted-foreground">
                <li>{quiet.length} crawled districts produced no grounded event in this window.</li>
                <li>No event does not mean no purchase. Routine renewals rarely reach the board as a separate item.</li>
                <li>Packet counts show how much text each district gave the model.</li>
              </ul>
              <ul className="mt-4 columns-1 gap-8 font-mono text-[10px] leading-6 sm:columns-2 sm:text-xs">
                {quiet.map((row) => (
                  <li key={row.district} className="flex justify-between gap-4 border-b border-border py-1">
                    <span>{row.district}</span>
                    <span className="text-muted-foreground">{row.packets} packets</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="figure-title">Uncrawled districts</h2>
              <ul className="mt-2 max-w-xl space-y-1 text-sm leading-6 text-muted-foreground">
                <li>
                  My list of Florida school districts holds {registry.length}. {crawled.length} post agendas on BoardDocs, a common agenda website, and I crawled those.
                </li>
                <li>{uncrawled.filter((row) => !["", "unknown"].includes(row.portal.trim().toLowerCase())).length} use other sites, or use BoardDocs only for policies, not agendas.</li>
                <li>
                  {uncrawled.filter((row) => ["", "unknown"].includes(row.portal.trim().toLowerCase())).length} are unknown:{" "}
                  {uncrawled.filter((row) => ["", "unknown"].includes(row.portal.trim().toLowerCase())).map((row) => row.county).join(" and ")}.
                </li>
              </ul>
              <ul className="mt-4 columns-1 gap-8 font-mono text-[10px] leading-6 sm:columns-2 sm:text-xs">
                {uncrawled.map((row) => (
                  <li key={row.district} className="flex justify-between gap-4 border-b border-border py-1">
                    <span>{row.district}</span>
                    <span className="text-muted-foreground">{row.portal || "unknown"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2">
            <div>
              <h2 className="figure-title">How to read a row</h2>
              <ul className="mt-2 max-w-xl space-y-1 text-sm leading-6 text-muted-foreground">
                <li>Stage is the latest event in the trajectory.</li>
                <li>Every quote is verbatim from the packet, 300 characters at most.</li>
                <li>Vendor and dollar amount appear only when they are in the packet text.</li>
                <li>District, date, and link come from the crawl, never the model.</li>
                <li>Follow the link and check me.</li>
              </ul>
              <dl className="mt-4 space-y-2">
                {(Object.keys(STAGE_DEFINITION) as EventState[]).map((state) => (
                  <div key={state} className="flex items-baseline gap-3 text-sm leading-6">
                    <dt className="w-32 shrink-0">
                      <Stage state={state} />
                    </dt>
                    <dd className="text-muted-foreground">{STAGE_DEFINITION[state]}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div id="linking">
              <h2 className="figure-title">How events link</h2>
              <ul className="mt-2 max-w-xl space-y-1 text-sm leading-6 text-muted-foreground">
                <li>Each event gets a short text signature.</li>
                <li>
                  An event joins its district&apos;s trajectory when that signature scores at least {development.metrics.linkThreshold.toFixed(2)} against the trajectory&apos;s last three events.
                </li>
                <li>The score is embedding similarity: a language model turns each text into a list of numbers, and the score is how close the two lists are, from 0 to 1. Add 0.08 for a shared purchase category and 0.08 for a shared vendor.</li>
              </ul>
              <p className="mt-4 font-mono text-[10px] sm:text-xs">
                <Link href="/holdout#lessons" className={linkClass}>Where this split a real pair</Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Receipt metrics={development.metrics} />
    </>
  );
}
