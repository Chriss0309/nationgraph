import { STATE_META } from "@/components/results/meta";
import {
  formatDate,
  formatSimilarity,
  type CaseStudy,
  type IsoDate,
} from "@/lib/dossier";
import { type CaseRow } from "@/lib/ledgers";

const linkClass = "underline decoration-border underline-offset-4 hover:decoration-primary";

/**
 * One row per district in the test, with what the software found and whether
 * that was right. `candidates` are single purchases spotted in one document;
 * `signals` are the groups it tried to connect them into.
 */
export interface CaseSummary {
  row: CaseRow;
  label: string;
  packets: number;
  candidates: number;
  meetings: number;
  signals: CaseStudy[];
  best: CaseStudy | null;
}

export function fyOf(row: CaseRow): string {
  return row.case_id.split("fy").at(-1) ?? "";
}

export function verdictText(summary: CaseSummary, floor: number, rejected: ReadonlySet<string>): string {
  const { row, signals, best } = summary;
  if (row.research_status !== "complete") return "skipped: too few documents";
  if (row.role === "control") {
    const fired = signals.filter((signal) => signal.events.length >= 2);
    if (fired.length === 0) return "no false alarm";
    const meetings = new Set(fired.flatMap((signal) => signal.events.map((event) => event.date))).size;
    return `false alarm: flagged something across ${meetings} ${meetings === 1 ? "meeting" : "meetings"}`;
  }
  if (best === null) return signals.length === 0 ? "missed: found nothing at all" : "missed: nothing scored";
  if (best.verdict.kind === "matched") {
    const scored = `scored ${formatSimilarity(best.verdict.similarity)}, ${best.verdict.leadDays} days early`;
    // What the software decided and what a person decided are different facts.
    return rejected.has(best.id) ? `flagged, but wrong: ${scored}` : `caught it: ${scored}`;
  }
  if (best.verdict.kind === "belowFloor") return `missed: best was ${formatSimilarity(best.verdict.similarity)}, needed ${floor.toFixed(2)}`;
  return "missed";
}

export function CandidateList({ signal }: { signal: CaseStudy }) {
  return (
    <ol className="mt-2 space-y-2 border-l border-border pl-3">
      {signal.events.map((event, index) => {
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
                document
              </a>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function CaseTable({
  summaries,
  caseNames,
  floor,
  rejected,
}: {
  summaries: CaseSummary[];
  caseNames: Map<string, string>;
  floor: number;
  rejected: ReadonlySet<string>;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <th className="py-2 pr-4 font-medium">District</th>
            <th className="py-2 pr-4 font-medium">Bought one?</th>
            <th className="py-2 pr-4 font-medium">Months read</th>
            <th className="py-2 pr-4 font-medium">Documents</th>
            <th className="py-2 pr-4 font-medium">Found</th>
            <th className="py-2 pr-4 font-medium">Result</th>
            <th className="py-2 font-medium">The purchase</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((summary) => (
            <tr key={summary.row.case_id} id={summary.row.case_id} className="border-b border-border align-top font-mono text-[10px] leading-5 sm:text-xs">
              <td className="py-2 pr-4 text-foreground">
                {summary.row.district}
                <span className="text-muted-foreground"> FY{fyOf(summary.row)}</span>
                {summary.row.role === "control" ? (
                  <p className="text-muted-foreground">paired with {caseNames.get(summary.row.matched_case_id) ?? summary.row.matched_case_id}</p>
                ) : null}
              </td>
              <td className="py-2 pr-4">{summary.row.role === "control" ? "no" : "yes"}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {formatDate(summary.row.window_start as IsoDate)} to {formatDate(summary.row.window_end as IsoDate)}
              </td>
              <td className="py-2 pr-4">{summary.packets}</td>
              <td className="py-2 pr-4">
                {summary.candidates} {summary.candidates === 1 ? "thing" : "things"}
                {summary.candidates > 0 ? ` across ${summary.meetings} ${summary.meetings === 1 ? "meeting" : "meetings"}` : ""}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={
                    summary.best?.verdict.kind === "matched" && !rejected.has(summary.best.id)
                      ? "text-ng-green-700"
                      : "text-muted-foreground"
                  }
                >
                  {verdictText(summary, floor, rejected)}
                </span>
                {summary.best ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted-foreground">
                      {summary.best.initiative || "Unnamed"} · {summary.best.events.length} {summary.best.events.length === 1 ? "document" : "documents"}
                    </summary>
                    <CandidateList signal={summary.best} />
                  </details>
                ) : null}
              </td>
              <td className="py-2">
                {summary.row.role === "positive" ? (
                  <a href={summary.row.outcome_url} target="_blank" rel="noreferrer" className={linkClass}>
                    went public {formatDate(summary.row.index_date as IsoDate)}
                  </a>
                ) : (
                  <span className="text-muted-foreground">never bought one</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
