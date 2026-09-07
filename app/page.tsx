import Link from "next/link";

import { STATE_META } from "@/components/results/meta";
import { Receipt } from "@/components/results/receipt";
import { SiteHeader } from "@/components/site-header";
import { Tiles, type Tile } from "@/components/tiles";
import { formatDate, formatMoney, loadDossier, requireDossier } from "@/lib/dossier";
import { pipelineStats } from "@/lib/ledgers";

function Screen({
  id,
  eyebrow,
  heading,
  children,
  tone = "plain",
}: {
  id: string;
  eyebrow: string;
  heading: string;
  children: React.ReactNode;
  tone?: "plain" | "card";
}) {
  return (
    <section id={id} className={`border-b border-border ${tone === "card" ? "bg-card" : ""}`}>
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">{eyebrow}</p>
        <h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{heading}</h2>
        {children}
      </div>
    </section>
  );
}

const linkClass = "underline decoration-border underline-offset-4 hover:decoration-primary";

export default function HomePage() {
  const development = requireDossier("development");
  const holdout = loadDossier("holdout");
  const board = loadDossier("board");
  const stats = pipelineStats();

  const packetsRead = Object.values(stats?.runs ?? {}).reduce((total, run) => total + (run?.unique_packets ?? 0), 0);
  const failures = Object.values(stats?.runs ?? {}).reduce((total, run) => total + (run?.failed ?? 0), 0);
  const characters = Object.values(stats?.runs ?? {}).reduce((total, run) => total + (run?.chars ?? 0), 0);

  const scopeTiles: Tile[] = [
    { label: "Districts crawled", value: String(stats?.districts.boarddocs ?? 0), note: `of ${stats?.districts.total ?? 67} in Florida` },
    { label: "Meetings indexed", value: (stats?.meetings ?? 0).toLocaleString() },
    { label: "Packets read", value: packetsRead.toLocaleString(), note: `${failures} fetch failures, ${Math.round(characters / 1_000_000)} million characters` },
  ];

  const resultTiles: Tile[] | null = holdout
    ? [
        {
          label: "Coverage",
          value: `${holdout.metrics.coverage.covered} of ${holdout.metrics.coverage.total}`,
          note: `${holdout.metrics.coverage.covered} of ${holdout.metrics.coverage.total} filings had a matching board event first. An event is a purchase step the model found in a packet. A match scores 0.50 or more against the filing.`,
        },
        {
          label: "Median lead",
          value: holdout.metrics.medianLeadDays === null ? "none" : `${holdout.metrics.medianLeadDays} days`,
          note: holdout.metrics.coverage.covered === 1 ? "Event to filing. One hit makes it the median." : "Event to filing, over covered cases.",
        },
        {
          label: "Control alarms",
          value: `${holdout.metrics.controls.fired} of ${holdout.metrics.controls.total}`,
          note: "Jefferson, a control, approved a Fortinet firewall outside E-rate. A purchase the board did make. The test counts it as an alarm.",
        },
        {
          label: "Precision",
          value: holdout.metrics.precision.labeled === 0 ? "pending" : `${holdout.metrics.precision.correct} of ${holdout.metrics.precision.labeled}`,
          note: holdout.metrics.precision.labeled === 0 ? "The share of matches a person confirms as right. The one match awaits that check." : "The share of matches a person confirmed as right.",
        },
      ]
    : null;

  const chains = (board?.cases ?? [])
    .filter((trajectory) => new Set(trajectory.events.map((event) => event.date)).size >= 2)
    .toSorted((a, b) => b.lastDate.localeCompare(a.lastDate));
  const holdoutRun = stats?.runs.holdout;

  return (
    <>
      <SiteHeader current="home" />
      <main>
        <section className="hero-surface border-b border-border">
          <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="hero-copy max-w-4xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 sm:text-xs">What this is</p>
              <h1 className="mt-4 font-heading text-[clamp(2.5rem,5.6vw,4.25rem)] leading-[0.98] font-semibold tracking-[-0.05em] text-balance text-white">
                Board packets, read for the next cybersecurity purchase.
              </h1>
              <ul className="mt-6 max-w-2xl space-y-2 text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
                <li>I built a prototype to test one claim.</li>
                <li>A packet is what a school board posts before meeting.</li>
                <li>The claim: a district&apos;s next cybersecurity purchase shows in those packets before the solicitation, the call for bids.</li>
                <li>The test below says how often it did.</li>
              </ul>
            </div>
            <div className="mt-8 rounded-md border border-white/20 bg-background/95 p-4 sm:p-5">
              <Tiles tiles={scopeTiles} columns={3} />
            </div>
          </div>
        </section>

        <Screen id="result" eyebrow="The result" heading="Holdout result" tone="card">
          <ul className="mt-4 max-w-2xl space-y-1 text-base leading-7">
            <li>A holdout is a test set I never touched while building.</li>
            <li>17 cases with a firewall solicitation filed under E-rate, the federal school internet discount.</li>
            <li>17 controls: districts and years with no such solicitation. Settings fixed first.</li>
          </ul>
          {resultTiles ? (
            <>
              <div className="mt-6">
                <Tiles tiles={resultTiles} columns={4} />
              </div>
              <p className="mt-6 font-heading text-2xl font-semibold tracking-tight">A weak result.</p>
              <p className="mt-2 font-mono text-[10px] sm:text-xs">
                <Link href="/holdout" className={linkClass}>Every case</Link>
              </p>
            </>
          ) : (
            <p className="mt-6 font-mono text-[10px] text-muted-foreground sm:text-xs">The holdout run has not been committed yet.</p>
          )}
        </Screen>

        <Screen id="feature" eyebrow="The feature" heading="Today's trajectories">
          <ul className="mt-4 max-w-2xl space-y-1 text-base leading-7">
            <li>A trajectory is one district&apos;s events that look like one purchase.</li>
            {board ? (
              <li>
                {board.metrics.clusters} over 18 months, {chains.length} spanning more than one meeting. A second run of the same code, not scored against filings. The holdout is.
              </li>
            ) : (
              <li>The board run has not been committed yet.</li>
            )}
          </ul>
          {chains.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">District</th>
                    <th className="py-2 pr-4 font-medium">Meetings</th>
                    <th className="py-2 pr-4 font-medium">Latest stage</th>
                    <th className="py-2 pr-4 font-medium">Purchase</th>
                    <th className="py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {chains.map((trajectory) => {
                    const latest = trajectory.events[trajectory.events.length - 1];
                    const meta = STATE_META[latest.state];
                    return (
                      <tr key={trajectory.id} className="border-b border-border align-top">
                        <td className="py-3 pr-4 font-medium">{trajectory.district}</td>
                        <td className="py-3 pr-4 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                          {formatDate(trajectory.firstDate)} to {formatDate(trajectory.lastDate)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] ${meta.badge}`}>
                            <span className={meta.dot} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <p>{trajectory.initiative || "Unnamed"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {latest.vendor ?? "vendor not in text"}
                            {latest.amount !== null ? ` · ${formatMoney(latest.amount)}` : ""}
                          </p>
                        </td>
                        <td className="py-3 font-mono text-[10px] leading-5 sm:text-xs">
                          {latest.source.isWeb ? (
                            <a href={latest.source.url} target="_blank" rel="noreferrer" className={linkClass}>
                              packet
                            </a>
                          ) : (
                            latest.source.label
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground sm:text-xs">
                Board run: same code and settings as the holdout, packets from {stats?.runs.board ? "Mar 7, 2025 to Sep 3, 2026" : "the last 18 months"}.{" "}
                <Link href="/board" className={linkClass}>
                  All {board?.metrics.clusters ?? 0} trajectories
                </Link>
              </p>
            </div>
          ) : null}
        </Screen>

        <Screen id="build" eyebrow="What I did" heading="The build" tone="card">
          <ol className="mt-6 grid gap-3 sm:grid-cols-5">
            {[
              ["Fetch", holdoutRun ? `${holdoutRun.unique_packets.toLocaleString()} packets` : "packets"],
              ["Extract", holdoutRun ? `${holdoutRun.keyword_relevant.toLocaleString()} passed a keyword filter and reached the model` : "model reads each packet"],
              ["Ground", holdout ? `${holdout.metrics.events} events kept. Most packets mention security without a purchase step.` : "quotes checked"],
              ["Link", holdout ? `${holdout.metrics.clusters} trajectories, 0 across meetings, joined at ${holdout.metrics.linkThreshold.toFixed(2)} or above` : "events joined"],
              ["Evaluate", holdout ? `${holdout.metrics.coverage.covered} of ${holdout.metrics.coverage.total} matched at ${holdout.metrics.matchFloor.toFixed(2)} or above` : "scored against filings"],
            ].map(([step, note], index) => (
              <li key={step} className="rounded-md border border-border bg-background p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{index + 1}</p>
                <p className="mt-1 font-heading text-lg font-semibold tracking-tight">{step}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{note}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 font-mono text-[10px] text-muted-foreground sm:text-xs">
            Holdout run counts. One Python file, trajectory.py, fixed before the holdout.{" "}
            <Link href="/holdout#pipeline" className={linkClass}>Pipeline receipt</Link>
          </p>
        </Screen>

        <Screen id="lessons" eyebrow="What I learned" heading="Lessons">
          <ol className="mt-4 max-w-2xl list-decimal space-y-2 pl-5 text-base leading-7">
            <li>My read: most E-rate firewall filings are renewals that never get their own board item.</li>
            <li>Boards publish approvals far more than deliberations.</li>
          </ol>
          <p className="mt-4 font-mono text-[10px] sm:text-xs">
            <Link href="/holdout#lessons" className={linkClass}>Full lessons and every case</Link>
          </p>
          <p className="mt-10 max-w-2xl font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Everyone in this space reads documents well now. Nobody models time and structure. That&apos;s where I&apos;d work.
          </p>
        </Screen>
      </main>
      <Receipt metrics={development.metrics} />
    </>
  );
}
