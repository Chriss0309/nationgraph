import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Minimal RFC 4180 reader for the committed ledgers (quoted fields, doubled quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((cells) => cells.some((cell) => cell.length > 0));
  if (!header) return [];
  return body.map((cells) =>
    Object.fromEntries(header.map((name, column) => [name, cells[column] ?? ""])),
  );
}

function readCsv(path: string): Record<string, string>[] | null {
  return existsSync(path) ? parseCsv(readFileSync(path, "utf8")) : null;
}

export interface DistrictRow {
  county: string;
  district: string;
  boarddocs_site: string;
  portal: string;
  evidence_url: string;
  notes: string;
}

export interface LedgerRow {
  district: string;
  meeting_date: string;
  url: string;
  status: string;
  chars: string;
}

export interface CaseRow {
  case_id: string;
  role: string;
  district: string;
  index_date: string;
  outcome_type: string;
  outcome_id: string;
  title: string;
  outcome_url: string;
  window_start: string;
  window_end: string;
  matched_case_id: string;
  research_status: string;
}

export interface PairRow {
  district: string;
  cluster_id: string;
  initiative_name: string;
  first_event_date: string;
  n_events: string;
  outcome_title: string;
  outcome_date: string;
  similarity: string;
  lead_days: string;
  matched: string;
  label: string;
}

export interface RunStats {
  source_rows: number;
  unique_packets: number;
  fetched: number;
  failed: number;
  short: number;
  chars: number;
  keyword_relevant: number;
  clipped_chars: number;
  approx_input_tokens: number;
}

export interface PipelineStats {
  generated: string;
  districts: { total: number; boarddocs?: number; other?: number; unknown?: number };
  meetings: number;
  meetings_span: [string, string] | null;
  runs: Partial<Record<"holdout" | "board", RunStats>>;
}

// Every path is spelled out so the bundler traces files, not the whole repository.
export function districts(): DistrictRow[] {
  return (readCsv(join(process.cwd(), "data", "districts.csv")) ?? []) as unknown as DistrictRow[];
}

export function boardLedger(): LedgerRow[] | null {
  return readCsv(join(process.cwd(), "data", "board", "crawl_ledger.csv")) as LedgerRow[] | null;
}

export function holdoutLedger(): LedgerRow[] | null {
  return readCsv(join(process.cwd(), "data", "holdout", "crawl_ledger.csv")) as LedgerRow[] | null;
}

export function holdoutCases(): CaseRow[] | null {
  return readCsv(join(process.cwd(), "data", "holdout", "cases.csv")) as CaseRow[] | null;
}

export function holdoutPairs(): PairRow[] | null {
  return readCsv(join(process.cwd(), "out-holdout", "linked_pairs.csv")) as PairRow[] | null;
}

export function pipelineStats(): PipelineStats | null {
  const path = join(process.cwd(), "data", "pipeline_stats.json");
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as PipelineStats) : null;
}

/** The case label trajectory.py saw as the district: "<district> | FY 2026" or "<district> | control FY 2026". */
export function caseLabel(row: CaseRow): string {
  const fy = row.case_id.split("fy").at(-1) ?? "";
  return row.role === "control" ? `${row.district} | control FY ${fy}` : `${row.district} | FY ${fy}`;
}
