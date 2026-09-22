import { CaseTable, fyOf, CandidateList, type CaseSummary } from "@/components/results/case-table";
import { LeadRuler } from "@/components/results/lead-ruler";
import { Receipt } from "@/components/results/receipt";
import { Reveal } from "@/components/results/reveal";
import { Coverage, type CoverageTile } from "@/components/results/viz/coverage";
import { Tiles, type Tile } from "@/components/tiles";
import {
  formatDate,
  formatMoney,
  formatSimilarity,
  loadDossier,
  requireDossier,
  type CaseStudy,
} from "@/lib/dossier";
import { caseLabel, districts, holdoutCases, holdoutLedger, holdoutPairs, pipelineStats } from "@/lib/ledgers";

const linkClass =
  "underline decoration-border underline-offset-4 transition-colors duration-150 hover:decoration-primary";

const USAC_BIDDING = "https://www.usac.org/e-rate/applicant-process/competitive-bidding/";
const POSTING = "https://jobs.ashbyhq.com/NationGraph/67bd40a7-e1fb-47c9-a92a-fb4dc8403f46";

/** One editorial band. Prose sits on a narrow measure; figures break wider. */
function Band({
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
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <Reveal className="reveal">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <span className="rule mt-4 max-w-[7rem]" />
            <h2 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{heading}</h2>
          </div>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

/** The one repeated shape: a short claim, then points that each fit on a line. */
function Claim({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 max-w-[54ch] font-heading text-xl leading-8 font-semibold tracking-[-0.02em] text-balance sm:text-2xl">{children}</p>;
}

function Points({ children }: { children: React.ReactNode }) {
  return <ul className="mt-6 max-w-[58ch] space-y-3 text-base leading-7">{children}</ul>;
}

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1rem_1fr] gap-3">
      <span aria-hidden="true" className="mt-3 h-px w-3 bg-ng-green-400" />
      <span>{children}</span>
    </li>
  );
}

/**
 * How many districts each agenda website covers, across all 67 in Florida.
 * Read from data/districts.csv so the shape can never drift from the registry.
 */
function Platforms() {
  const registry = districts();
  const counts = new Map<string, number>();
  for (const row of registry) {
    counts.set(row.portal, (counts.get(row.portal) ?? 0) + 1);
  }
  const ordered = [...counts].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = ordered.find(([portal]) => portal === "BoardDocs") ?? ["BoardDocs", 0];
  const tail = ordered.filter(([portal]) => portal !== "BoardDocs");
  const tailTotal = tail.reduce((total, [, count]) => total + count, 0);

  return (
    <figure
      className="viz mt-8"
      role="img"
      aria-label={`${head[1]} of ${registry.length} Florida school districts post agendas on BoardDocs. The other ${tailTotal} use ${tail.length} different websites.`}
    >
      <div className="flex h-10 w-full overflow-hidden border border-border">
        <div
          className="flex items-center justify-start bg-ng-green-400 px-3 font-mono text-[10px] text-white sm:text-xs"
          style={{ width: `${(head[1] / registry.length) * 100}%` }}
        >
          BoardDocs · {head[1]}
        </div>
        {tail.map(([portal, count]) => (
          <div
            key={portal}
            title={`${portal} · ${count}`}
            className="border-l border-border bg-ng-tint-2 first:border-l-0"
            style={{ width: `${(count / registry.length) * 100}%` }}
          />
        ))}
      </div>
      <figcaption className="mt-4 grid gap-x-8 gap-y-1 font-mono text-[10px] leading-5 text-muted-foreground sm:grid-cols-2 sm:text-xs lg:grid-cols-3">
        {tail.map(([portal, count]) => (
          <span key={portal}>
            {portal} · {count}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export default function HomePage() {
  const development = requireDossier("development");
  const holdout = loadDossier("holdout");
  const board = loadDossier("board");
  const stats = pipelineStats();
  const registry = districts();
  const cases = holdoutCases() ?? [];
  const ledger = holdoutLedger() ?? [];
  const rejectedIds = new Set(
    (holdoutPairs() ?? []).filter((pair) => pair.label === "incorrect").map((pair) => pair.cluster_id),
  );

  const holdoutRun = stats?.runs.holdout;
  const boardRun = stats?.runs.board;
  const floor = holdout?.metrics.matchFloor ?? development.metrics.matchFloor;
  const packetsRead = (holdoutRun?.unique_packets ?? 0) + (boardRun?.unique_packets ?? 0);
  const fetchFailures = (holdoutRun?.failed ?? 0) + (boardRun?.failed ?? 0);

  // A match the frozen rule counted but a human read and rejected is not a catch.
  const rejected = holdout ? holdout.metrics.precision.labeled - holdout.metrics.precision.correct : 0;
  const verifiedCovered = holdout ? holdout.metrics.coverage.covered - rejected : 0;
  const coverageTotal = holdout?.metrics.coverage.total ?? 0;
  const hit = holdout?.hit ?? null;

  const meetingsOf = (signal: CaseStudy) => new Set(signal.events.map((event) => event.date)).size;
  const crossMeeting = (holdout?.cases ?? []).filter((signal) => meetingsOf(signal) >= 2).length;
  const boardCrossMeeting = (board?.cases ?? []).filter((signal) => meetingsOf(signal) >= 2).length;
  const boardDistricts = new Set((board?.cases ?? []).map((signal) => signal.district)).size;
  const charlotte = (board?.cases ?? []).find(
    (signal) => signal.district.startsWith("Charlotte") && signal.category === "firewall",
  );

  const packetsByLabel = new Map<string, number>();
  for (const row of ledger) {
    if (row.status.startsWith("failed")) continue;
    packetsByLabel.set(row.district, (packetsByLabel.get(row.district) ?? 0) + 1);
  }
  const signalsByLabel = new Map<string, CaseStudy[]>();
  for (const signal of holdout?.cases ?? []) {
    const list = signalsByLabel.get(signal.district) ?? [];
    list.push(signal);
    signalsByLabel.set(signal.district, list);
  }
  const caseNames = new Map(cases.map((row) => [row.case_id, `${row.district} FY${fyOf(row)}`]));

  const summaries: CaseSummary[] = cases
    .map((row) => {
      const label = caseLabel(row);
      const signals = signalsByLabel.get(label) ?? [];
      const best =
        signals
          .filter((signal) => signal.verdict.kind !== "noOutcome")
          .toSorted((a, b) => {
            const sa = a.verdict.kind === "noOutcome" ? -1 : a.verdict.similarity;
            const sb = b.verdict.kind === "noOutcome" ? -1 : b.verdict.similarity;
            return sb - sa;
          })[0] ?? null;
      return {
        row,
        label,
        packets: packetsByLabel.get(label) ?? 0,
        candidates: signals.reduce((total, signal) => total + signal.events.length, 0),
        meetings: new Set(signals.flatMap((signal) => signal.events.map((event) => event.date))).size,
        signals,
        best,
      };
    })
    .toSorted(
      (a, b) =>
        Number(a.row.role === "control") - Number(b.row.role === "control") ||
        a.row.index_date.localeCompare(b.row.index_date) ||
        a.row.district.localeCompare(b.row.district),
    );

  const alarm = summaries.find(
    (summary) => summary.row.role === "control" && summary.signals.some((signal) => signal.events.length >= 2),
  );
  const alarmSignal = alarm?.signals.find((signal) => signal.events.length >= 2) ?? null;
  const positives = cases.filter((row) => row.role === "positive" && row.research_status === "complete");
  const controls = cases.filter((row) => row.role === "control");
  const packetCounts = summaries.map((summary) => summary.packets).filter((count) => count > 0);
  const silent = summaries.filter(
    (summary) => summary.row.role === "positive" && summary.row.research_status === "complete" && summary.candidates === 0,
  );
  const silentPackets = silent.map((summary) => summary.packets).filter((count) => count > 0);

  // Every agenda website except BoardDocs. "unknown" is a gap in the registry, not a system.
  const tailCounts = new Map<string, number>();
  for (const row of registry) {
    if (row.portal === "BoardDocs" || row.portal === "unknown") continue;
    tailCounts.set(row.portal, (tailCounts.get(row.portal) ?? 0) + 1);
  }
  const tailSystems = [...tailCounts];

  const coverageTiles: CoverageTile[] = Array.from({ length: coverageTotal }, (_, index) =>
    index < rejected
      ? { found: false, title: "Indian River", detail: "flagged, but wrong" }
      : { found: false, title: null, detail: "nothing" },
  );

  const resultTiles: Tile[] | null = holdout
    ? [
        {
          label: "Caught early",
          value: `${verifiedCovered} of ${coverageTotal}`,
          emphasis: true,
          note: "It flagged one. I read the document behind it myself. It was wrong.",
        },
        {
          label: "Held up when checked",
          value: `${holdout.metrics.precision.correct} of ${holdout.metrics.precision.labeled}`,
          note: "One flag, checked by hand, thrown out.",
        },
        {
          label: "False alarms",
          value: `${holdout.metrics.controls.fired} of ${holdout.metrics.controls.total}`,
          note: "Jefferson County bought a firewall, just not through this program. So it counts against me.",
        },
        {
          label: "Linked two meetings",
          value: `${crossMeeting} of ${holdout.metrics.clusters}`,
          note: "Connecting one meeting to the next was the whole point. It never managed it once.",
        },
      ]
    : null;

  const scope: [string, string, string][] = [
    ["Places covered", "110,000 government bodies", `${stats?.districts.boarddocs ?? 0} Florida school districts`],
    ["Kinds of documents", "11 per place", "1 — board meeting documents"],
    ["Contact database", "2 million people", "none"],
    ["How often it runs", "always on", "once, then frozen"],
  ];

  const lessons: [string, string][] = [
    [
      "Most school spending is boring.",
      `I assumed a purchase meant somebody made a decision. Mostly it's last year's contract, renewed, with nobody discussing it. ${silent.length} of the ${positives.length} districts never mentioned a purchase at all — across ${silentPackets.length > 0 ? `${Math.min(...silentPackets)} to ${Math.max(...silentPackets)}` : "dozens of"} documents each.`,
    ],
    [
      "The calendar decides, not the district.",
      "11 of the 17 purchases land in the same year — the year the federal budget resets and every district buys at once. One district filed in January five years running. Nobody is choosing that timing.",
    ],
    [
      "The rules decide where the evidence is.",
      "I assumed a purchase leaves a trail you can read forward. Here it runs backwards: the public request comes first, the board vote comes after. No amount of better reading fixes that.",
    ],
    [
      "A good score isn't a right answer.",
      `The one flag scored ${hit ? formatSimilarity(hit.verdict.similarity) : "0.53"} because both documents used the same boilerplate: "necessary software and licenses." Still the wrong purchase, a whole year off. Nothing in the software could tell.`,
    ],
    [
      "Lock the test before you look.",
      `I fixed the districts and every setting before I could see a single answer. That's the only reason ${verifiedCovered} of ${coverageTotal} is something I can act on, instead of a number I quietly nudged until it looked good.`,
    ],
  ];

  return (
    <>
      <main>
        {/* What I built, what I tested, what happened. In that order, in one screen. */}
        <section className="hero-surface grain relative border-b border-border">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="hero-copy">
              <p className="eyebrow text-white/60">Chris Ooi · a project about public school spending</p>
              <h1 className="mt-6 max-w-[20ch] font-heading text-[clamp(2.5rem,5.6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.03em] text-balance text-white">
                I tried to predict what school districts buy before they announce it.
              </h1>
              <p className="mt-6 max-w-[42ch] text-xl leading-9 text-white/85">
                It didn&apos;t work. The reason it didn&apos;t work is the interesting part.
              </p>

              <dl className="mt-14 grid gap-x-12 gap-y-8 sm:grid-cols-3">
                <div>
                  <dt className="eyebrow text-white/55">What I built</dt>
                  <dd className="mt-3 max-w-[30ch] text-base leading-7 text-white/85">
                    Software that reads school board meeting documents and looks for tech purchases coming down the pipe.
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-white/55">What I tested it on</dt>
                  <dd className="mt-3 max-w-[30ch] text-base leading-7 text-white/85">
                    {coverageTotal} real firewall purchases it had never seen. Could it have called them early?
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-white/55">What happened</dt>
                  <dd className="mt-3 max-w-[30ch] text-base leading-7 text-white">
                    No. {verifiedCovered} out of {coverageTotal}. Not because the reading failed — a federal rule means the
                    purchase goes public <em>before</em> the board votes. There was nothing there to find.
                  </dd>
                </div>
              </dl>
            </div>

            {holdout ? (
              <figure className="mt-16">
                <Coverage
                  label={`${verifiedCovered} of ${coverageTotal} purchases had any warning sign before them.`}
                  tiles={coverageTiles}
                />
                <figcaption className="mt-4 max-w-[70ch] text-[0.8125rem] leading-6 text-white/60">
                  One box per purchase. {coverageTotal - rejected} had nothing before them. One got flagged, and that one turned
                  out to be wrong.
                </figcaption>
              </figure>
            ) : null}
          </div>
        </section>

        <Band id="scope" eyebrow="First, the honest part" heading="What this is, and what it isn't" tone="card">
          <Claim>It&apos;s a small copy of one thing NationGraph does. It loses on every count but two.</Claim>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2 pr-6 font-medium"> </th>
                  <th className="py-2 pr-6 font-medium">NationGraph</th>
                  <th className="py-2 font-medium">Mine</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11px] leading-6 sm:text-xs">
                {scope.map(([label, theirs, mine]) => (
                  <tr key={label} className="border-b border-border">
                    <td className="py-2.5 pr-6 text-muted-foreground">{label}</td>
                    <td className="py-2.5 pr-6">{theirs}</td>
                    <td className="py-2.5">{mine}</td>
                  </tr>
                ))}
                <tr className="border-b border-border">
                  <td className="py-2.5 pr-6 text-muted-foreground">Tested on data it hadn&apos;t seen</td>
                  <td className="py-2.5 text-muted-foreground">not published</td>
                  <td className="py-2.5 text-ng-green-700">
                    {coverageTotal} that bought, {controls.length} that didn&apos;t
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2.5 pr-6 text-muted-foreground">Wrong answers, published</td>
                  <td className="py-2.5 text-muted-foreground">not published</td>
                  <td className="py-2.5 text-ng-green-700">1, found by hand</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Points>
            <Point>One state. One kind of document. One run.</Point>
            <Point>I built it to be proven wrong, not to be useful.</Point>
            <Point>
              The last two rows are the only ones that matter. They&apos;re also the two you can&apos;t do to a product you have
              to sell.
            </Point>
          </Points>
          <p className="mt-6 font-mono text-[10px] text-muted-foreground sm:text-xs">
            Left column: NationGraph&apos;s own published numbers.
          </p>
        </Band>

        <Band id="test" eyebrow="The test" heading="How I tested it">
          <Claim>I locked everything down before I could see a single answer.</Claim>
          <Points>
            <Point>
              {positives.length} districts that bought a firewall. {controls.length} that didn&apos;t. I didn&apos;t pick them —
              they came out of a federal database.
            </Point>
            <Point>For each one, it read every board document from the 18 months before the purchase.</Point>
            {packetCounts.length > 0 ? (
              <Point>
                {packetCounts.reduce((total, count) => total + count, 0).toLocaleString()} documents.{" "}
                {Math.min(...packetCounts)} to {Math.max(...packetCounts)} per district. {holdoutRun?.failed ?? 0} failed to
                download.
              </Point>
            ) : null}
            <Point>Flagging one of the districts that bought nothing counts as a mistake.</Point>
            <Point>
              Three blind spots, up front: firewalls bought outside this program, anything filed after Sep 7 2026, and the fact
              that 11 of the {coverageTotal} land in one single year.
            </Point>
          </Points>

          {resultTiles ? (
            <div className="mt-12">
              <Tiles tiles={resultTiles} columns={4} />
            </div>
          ) : (
            <p className="mt-6 font-mono text-xs text-muted-foreground">The test run hasn&apos;t been committed yet.</p>
          )}

          {holdout ? (
            <Points>
              <Point>It read {holdoutRun?.unique_packets.toLocaleString()} documents.</Point>
              <Point>
                It pulled out {holdout.metrics.events} possible purchases. Each one had to quote the document word for word, or it
                got thrown out.
              </Point>
              <Point>
                Then it tried to connect the ones that looked like the same purchase. It never once connected two different
                meetings.
              </Point>
              <Point>
                On my practice set it looked great — it caught {development.metrics.coverage.covered} of{" "}
                {development.metrics.coverage.total} with no false alarms. On data it hadn&apos;t seen, it didn&apos;t. That gap
                is the whole reason you hold data back.
              </Point>
            </Points>
          ) : null}

          <div className="mt-12 space-y-3">
            <details className="border-t border-border pt-4">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">
                See all {summaries.length} districts
              </summary>
              <p className="mt-4 max-w-[58ch] text-sm leading-6 text-muted-foreground">
                Every district, what it found, and whether that was right. A district counts as caught when something it found
                before the purchase scores {floor.toFixed(2)} or higher against it.
              </p>
              <CaseTable summaries={summaries} caseNames={caseNames} floor={floor} rejected={rejectedIds} />
            </details>

            <details className="border-t border-border pt-4">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">
                See how it works, step by step
              </summary>
              <ol className="mt-4 max-w-[58ch] list-decimal space-y-2 pl-5 text-sm leading-6">
                <li>
                  <strong>Download.</strong> Grab every board document from the months leading up to the purchase.
                </li>
                <li>
                  <strong>Read.</strong> Skip anything that never mentions security or networks.{" "}
                  {holdoutRun
                    ? `${holdoutRun.keyword_relevant.toLocaleString()} of ${holdoutRun.unique_packets.toLocaleString()} made the cut.`
                    : ""}{" "}
                  Send the rest to the model and ask what&apos;s being bought.
                </li>
                <li>
                  <strong>Check the quote.</strong> Throw it out unless the quote is in the document word for word. Same for the
                  vendor name and the dollar amount. Dates and links never come from the model.
                </li>
                <li>
                  <strong>Connect.</strong> Try to link things from the same district that look like the same purchase.
                </li>
                <li>
                  <strong>Score.</strong> Compare what it found against the real purchase and see how close it got.
                </li>
              </ol>
              {stats ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-md border border-border bg-card p-4 font-mono text-[10px] leading-6 sm:text-xs">
                    <p className="uppercase tracking-[0.14em] text-muted-foreground">Districts</p>
                    <p>{stats.districts.total} school districts in Florida</p>
                    <p>{stats.districts.boarddocs ?? 0} post agendas on BoardDocs, so I read those</p>
                    <p>
                      {stats.districts.other ?? 0} use a different website · {stats.districts.unknown ?? 0} I couldn&apos;t work
                      out
                    </p>
                    <p>
                      {stats.meetings.toLocaleString()} meetings listed
                      {stats.meetings_span ? ` (${stats.meetings_span[0]} to ${stats.meetings_span[1]})` : ""}
                    </p>
                    <p className="text-muted-foreground">pulled {stats.generated}</p>
                  </div>
                  {([["The test", holdoutRun], ["The live run", boardRun]] as const).map(([name, run]) =>
                    run ? (
                      <div key={name} className="rounded-md border border-border bg-card p-4 font-mono text-[10px] leading-6 sm:text-xs">
                        <p className="uppercase tracking-[0.14em] text-muted-foreground">{name}</p>
                        <p>
                          {run.unique_packets.toLocaleString()} documents · {run.failed} failed · {run.short} came back nearly
                          empty
                        </p>
                        <p>{run.chars.toLocaleString()} characters of text</p>
                        <p>{run.keyword_relevant.toLocaleString()} got past the keyword filter</p>
                        <p>about {run.approx_input_tokens.toLocaleString()} tokens sent to the model</p>
                      </div>
                    ) : null,
                  )}
                </div>
              ) : null}
            </details>
          </div>
        </Band>

        {hit ? (
          <Band id="match" eyebrow="The twist" heading="The one thing it flagged" tone="card">
            <Claim>It looked like a win. I read the document myself, and it was wrong.</Claim>
            <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
              <div className="max-w-[56ch] space-y-4 text-base leading-7">
                <p>
                  One district, Indian River. A board document from {formatDate(hit.events[0].date)} matched a purchase{" "}
                  {hit.verdict.leadDays} days later. On a dashboard that&apos;s a hit — ten months of warning.
                </p>
                <p>
                  Except the document isn&apos;t about that purchase. It&apos;s a status update on a request the district had{" "}
                  <strong className="font-semibold">already sent out</strong>. It says so itself:{" "}
                  <span className="italic">&ldquo;The Cat 2 470 was filed on January 24, 2022.&rdquo;</span> That&apos;s the year
                  before. My test didn&apos;t include that year, so the software shoved the match forward onto the next purchase
                  it could see.
                </p>
                <p>
                  Reading that one document is where the whole finding came from. The board votes late because it has to. The
                  order is fixed:{" "}
                  <a href={USAC_BIDDING} target="_blank" rel="noreferrer" className={linkClass}>
                    post the request, wait 28 days, take bids, then ask the board
                  </a>
                  . And Indian River files in January every year. So any document about last year&apos;s request looks like a
                  ten-month head start on this year&apos;s.
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Marked wrong.{" "}
                  {hit.verdict.outcome.url ? (
                    <a href={hit.verdict.outcome.url} target="_blank" rel="noreferrer" className={linkClass}>
                      the actual filing
                    </a>
                  ) : null}
                </p>
              </div>
              <div className="self-start rounded-lg border border-border bg-background p-6">
                <LeadRuler hit={{ ...hit, district: hit.district.split(" | ")[0] }} />
                <p className="mt-4 text-[0.8125rem] leading-6 text-muted-foreground">The head start that wasn&apos;t there.</p>
                <CandidateList signal={hit} />
              </div>
            </div>

            {alarm && alarmSignal ? (
              <div className="mt-12 max-w-[58ch] border-t border-border pt-6">
                <h3 className="figure-title">And the one false alarm</h3>
                <Points>
                  <Point>
                    {alarm.row.district} was supposed to be a district that bought nothing. It flagged them anyway.
                  </Point>
                  <Point>They really did buy a firewall — just not through this federal program.</Point>
                  <Point>I picked that group by the program only, so it counts against me. That&apos;s what the shortcut cost.</Point>
                </Points>
              </div>
            ) : null}
          </Band>
        ) : null}

        {board && charlotte ? (
          <Band id="live" eyebrow="The other half" heading="Where this would actually work">
            <Claim>This one program is a dead end by design. Outside it, the board really does go first.</Claim>
            <Points>
              <Point>Nothing forces a district to go public before the board votes, unless the federal program does.</Point>
              <Point>So I pointed the same frozen software at every district I&apos;d collected, over the last 18 months.</Point>
              <Point>No answer key this time. Just whatever it found.</Point>
              <Point>
                It connected {boardCrossMeeting} things across two or more meetings. In the test it connected {crossMeeting}.
                Same code, same settings, different pile of documents.
              </Point>
            </Points>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <figure className="rounded-lg border border-ng-green-300 bg-ng-tint-1 p-6 sm:p-7">
                <figcaption className="eyebrow text-ng-green-800">Happening right now</figcaption>
                <p className="mt-4 font-heading text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.025em]">
                  {charlotte.district}
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {formatDate(charlotte.events[0].date)}
                  {charlotte.events[0].amount ? ` · ${formatMoney(charlotte.events[0].amount)}` : ""}
                  {charlotte.events[0].vendor ? ` · ${charlotte.events[0].vendor}` : ""}
                </p>
                <p className="mt-4 text-base leading-7">
                  The board approved a firewall contract. Nothing has gone public yet.
                </p>
                <blockquote className="mt-4 border-l-2 border-ng-green-400 pl-4 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                  {charlotte.events[0].evidence}
                </blockquote>
                <p className="mt-4 font-mono text-[10px] sm:text-xs">
                  <a href={charlotte.events[0].source.url} target="_blank" rel="noreferrer" className={linkClass}>
                    the document
                  </a>
                </p>
              </figure>

              <div className="max-w-[48ch] space-y-4 self-center text-base leading-7">
                <p className="text-muted-foreground">
                  {boardRun?.unique_packets.toLocaleString()} documents across {stats?.districts.boarddocs} districts.{" "}
                  {board.metrics.events} possible purchases found, in {boardDistricts} districts. The rest were quiet.
                </p>
                <p className="border-l-2 border-border pl-4 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
                  Being straight with you: there&apos;s no answer key for this run. Nothing here is graded, and none of it is
                  evidence the way the test is. It&apos;s just what the thing sees when you point it somewhere the rules
                  haven&apos;t already closed off.
                </p>
              </div>
            </div>
          </Band>
        ) : null}

        <Band id="lessons" eyebrow="What I learned" heading="Five things about how schools buy stuff" tone="card">
          <Claim>I knew nothing about any of this when I started. Here&apos;s what stuck.</Claim>
          <ol className="mt-10 max-w-[64ch] border-t border-border">
            {lessons.map(([claim, receipt], index) => (
              <li
                key={claim}
                className="grid grid-cols-[2.5rem_1fr] gap-x-5 gap-y-2 border-b border-border py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-x-6"
              >
                <span className="eyebrow pt-1.5">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-heading text-lg font-semibold tracking-tight">{claim}</p>
                  <p className="mt-2 text-[0.9375rem] leading-7 text-muted-foreground">{receipt}</p>
                </div>
              </li>
            ))}
          </ol>
        </Band>

        <Band id="next" eyebrow="What I'd work on" heading="Three things I'd build at NationGraph">
          <Claim>
            Your job posting asks for someone who thinks about{" "}
            <a href={POSTING} target="_blank" rel="noreferrer" className={linkClass}>
              &ldquo;how to build a system capable of scraping the next 10,000&rdquo;
            </a>{" "}
            sites. Here&apos;s what this run taught me about that.
          </Claim>

          <ol className="mt-12 max-w-4xl space-y-12">
            <li>
              <p className="eyebrow">01</p>
              <h3 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-balance sm:text-3xl">
                Write one reader per website type, not one per district.
              </h3>
              <Points>
                <Point>
                  One reader got me {stats?.districts.boarddocs} of Florida&apos;s {registry.length} districts.{" "}
                  {packetsRead.toLocaleString()} documents, {fetchFailures} failures.
                </Point>
                <Point>
                  The other {registry.length - (stats?.districts.boarddocs ?? 0)} are sorted too, by which website they use:{" "}
                  {tailSystems.length} different ones, {tailSystems.filter(([, n]) => n === 1).length} of which cover a single
                  district. Two I couldn&apos;t work out at all.
                </Point>
                <Point>
                  That list tells you what the next reader is worth <em>before</em> anyone writes it. I&apos;d build this list
                  first, for every state.
                </Point>
              </Points>
              <Platforms />
            </li>

            <li>
              <p className="eyebrow">02</p>
              <h3 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-balance sm:text-3xl">
                Turn the quote check into a smoke alarm.
              </h3>
              <Points>
                <Point>Nothing gets kept here unless its quote is in the document word for word.</Point>
                <Point>
                  That&apos;s there for accuracy, but it doubles as a warning light. When a site changes its layout and the text
                  comes out mangled, that number drops before anything <em>looks</em> broken.
                </Point>
                <Point>
                  Track it per site, alert when it slips. Your posting&apos;s hardest line is knowing when{" "}
                  <span className="italic">&ldquo;extraction silently becomes incorrect&rdquo;</span> — this is a concrete answer
                  to it.
                </Point>
                <Point>A scraper that returns a clean 200 and garbage is worse than one that just fails.</Point>
              </Points>
            </li>

            <li>
              <p className="eyebrow">03</p>
              <h3 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.025em] text-balance sm:text-3xl">
                Teach it the rules, not just the words.
              </h3>
              <Points>
                <Point>This is the finding, turned into a fix.</Point>
                <Point>
                  Software that doesn&apos;t know the bidding rule will keep matching documents the rule already ruled out. Mine
                  scored {hit ? formatSimilarity(hit.verdict.similarity) : "0.53"} on shared boilerplate and landed a full year
                  off.
                </Point>
                <Point>
                  Knowing exactly which district said something is one problem. Knowing which program it falls under, and where
                  that program makes the first public document appear, is the next one.
                </Point>
                <Point>
                  Get that in and it can say &ldquo;nothing here, and here&apos;s why&rdquo; instead of ranking noise. It also
                  tells you where not to waste crawling.
                </Point>
              </Points>
            </li>
          </ol>

          <figure className="mt-16 max-w-3xl border-l-2 border-primary pl-6 sm:pl-8">
            <p className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.12] font-semibold tracking-[-0.025em] text-balance">
              Reading the documents was the easy part. Putting them in order was what broke.
            </p>
            {holdout && holdoutRun ? (
              <figcaption className="mt-5 max-w-[58ch] text-[0.9375rem] leading-7 text-muted-foreground">
                {holdoutRun.unique_packets.toLocaleString()} documents, {holdoutRun.failed} failures,{" "}
                {holdout.metrics.events} purchases found, each with a real quote behind it. Then it connected {crossMeeting} of
                them across two meetings. The closest it got: one district talked about a security purchase behind closed doors
                and approved it nine days later. The software missed the link by three thousandths of a point — because the model
                wrote &ldquo;solution&rdquo; once and &ldquo;service&rdquo; the other time.
              </figcaption>
            ) : null}
          </figure>
        </Band>
      </main>
      <Receipt />
    </>
  );
}
