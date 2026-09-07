import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Branded ISO date, validated once at the artifact boundary. */
export type IsoDate = string & { readonly __brand: "IsoDate" };

export type EventState =
  | "DISCUSSION"
  | "WORKSHOP"
  | "BUDGET"
  | "AUTHORIZATION"
  | "SOLICITATION"
  | "AWARD"
  | "RENEWAL"
  | "OTHER";

export interface SignalEvent {
  date: IsoDate;
  state: EventState;
  action: string;
  vendor: string | null;
  amount: number | null;
  summary: string;
  evidence: string;
  source: {
    url: string;
    isWeb: boolean;
    type: string;
    label: string;
    context: string;
  };
}

export interface Outcome {
  title: string;
  type: string;
  date: IsoDate;
  url: string | null;
}

/**
 * A lead-days label can only be rendered for a matched verdict.
 * Unmatched artifact lead-day values never enter the domain model.
 */
export type Verdict =
  | {
      kind: "matched";
      similarity: number;
      leadDays: number;
      outcome: Outcome;
    }
  | { kind: "belowFloor"; similarity: number; outcome: Outcome }
  | { kind: "noOutcome" };

export type MatchedVerdict = Extract<Verdict, { kind: "matched" }>;

export interface CaseStudy<V extends Verdict = Verdict> {
  id: string;
  district: string;
  initiative: string;
  category: string;
  firstDate: IsoDate;
  lastDate: IsoDate;
  events: [SignalEvent, ...SignalEvent[]];
  verdict: V;
}

export type MatchedCaseStudy = CaseStudy<MatchedVerdict>;

export interface DossierMetrics {
  docs: number;
  events: number;
  clusters: number;
  matches: number;
  medianLeadDays: number | null;
  coverage: { covered: number; total: number; rate: number };
  controls: {
    total: number;
    fired: number;
    rate: number;
    multiEventClusters: number;
  };
  precision: { correct: number; labeled: number; rate: number | null };
  linkThreshold: number;
  matchFloor: number;
}

export interface Scoreboard {
  purchasers: { total: number; covered: number };
  controls: { total: number; fired: number };
}

export interface DateSpan {
  min: IsoDate;
  max: IsoDate;
}

export interface Dossier {
  metrics: DossierMetrics;
  cases: CaseStudy[];
  hit: MatchedCaseStudy | null;
  scoreboard: Scoreboard;
  span: DateSpan | null;
}

/** The three pipeline runs the site renders; each is a `trajectory.py --outdir`. */
export type DatasetName = "development" | "holdout" | "board";

const DATASET_DIRS: Record<DatasetName, string> = {
  development: "out",
  holdout: "out-holdout",
  board: "out-board",
};

interface RawEvent {
  date: string;
  state: string;
  action: string;
  vendor: string | null;
  amount: number | null;
  summary: string;
  evidence: string;
  url: string;
  source_type: string;
}

interface RawTimeline {
  district: string;
  initiative_name: string;
  category: string;
  first_date: string;
  last_date: string;
  events: RawEvent[];
}

interface RawComparison {
  matched: boolean;
  similarity: number | null;
  outcome_title: string | null;
  outcome_type: string | null;
  outcome_date: string | null;
  outcome_url: string | null;
  lead_days: number | null;
}

interface RawMetrics {
  n_docs: number;
  n_events: number;
  n_clusters: number;
  coverage: { covered: number; total: number; rate: number };
  median_lead_days: number | null;
  control_fp: {
    firing_districts: number;
    control_districts: number;
    rate: number;
    n_multi_event_clusters: number;
  };
  precision: { correct: number; labeled: number; rate: number | null };
  threshold: number;
  match_threshold: number;
}

interface RawArtifacts {
  timelines: Record<string, RawTimeline>;
  comparison: Record<string, RawComparison>;
  metrics: RawMetrics;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEB_URL = /^https?:\/\//i;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const moneyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  style: "percent",
});

const countWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

function toUtcDate(value: IsoDate): Date {
  return new Date(`${value}T00:00:00Z`);
}

function parseIsoDate(value: unknown, field: string): IsoDate {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new Error(`Invalid ISO date at ${field}`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date at ${field}: ${value}`);
  }

  return value as IsoDate;
}

function parseState(value: string): EventState {
  switch (value) {
    case "DISCUSSION":
    case "WORKSHOP":
    case "BUDGET":
    case "AUTHORIZATION":
    case "SOLICITATION":
    case "AWARD":
    case "RENEWAL":
      return value;
    default:
      return "OTHER";
  }
}

export function formatSourceType(value: string): string {
  return value.replaceAll("_", " ");
}

function sourceContext(url: string, type: string): string {
  return /Regular[_-]School[_-]Board[_-]Meeting/i.test(url)
    ? "Regular board meeting"
    : formatSourceType(type);
}

function parseEvent(event: RawEvent, field: string): SignalEvent {
  return {
    action: event.action,
    amount: event.amount,
    date: parseIsoDate(event.date, `${field}.date`),
    evidence: event.evidence,
    source: {
      context: sourceContext(event.url, event.source_type),
      isWeb: WEB_URL.test(event.url),
      label: formatSourceType(event.source_type),
      type: event.source_type,
      url: event.url,
    },
    state: parseState(event.state),
    summary: event.summary,
    vendor: event.vendor,
  };
}

function parseOutcome(id: string, comparison: RawComparison): Outcome {
  if (
    typeof comparison.outcome_title !== "string" ||
    typeof comparison.outcome_type !== "string"
  ) {
    throw new Error(`Incomplete outcome for ${id}`);
  }

  if (
    comparison.outcome_url !== null &&
    typeof comparison.outcome_url !== "string"
  ) {
    throw new Error(`Invalid outcome URL for ${id}`);
  }

  return {
    date: parseIsoDate(comparison.outcome_date, `${id}.outcome_date`),
    title: comparison.outcome_title,
    type: comparison.outcome_type,
    url: comparison.outcome_url,
  };
}

function parseVerdict(id: string, comparison: RawComparison): Verdict {
  if (comparison.matched) {
    if (
      typeof comparison.similarity !== "number" ||
      typeof comparison.lead_days !== "number"
    ) {
      throw new Error(`Matched comparison lacks score or lead days for ${id}`);
    }

    return {
      kind: "matched",
      leadDays: comparison.lead_days,
      outcome: parseOutcome(id, comparison),
      similarity: comparison.similarity,
    };
  }

  if (comparison.similarity !== null) {
    return {
      kind: "belowFloor",
      outcome: parseOutcome(id, comparison),
      similarity: comparison.similarity,
    };
  }

  if (
    comparison.outcome_title !== null ||
    comparison.outcome_type !== null ||
    comparison.outcome_date !== null ||
    comparison.outcome_url !== null
  ) {
    throw new Error(`Outcome without a similarity score for ${id}`);
  }

  return { kind: "noOutcome" };
}

function isMatchedCase(caseStudy: CaseStudy): caseStudy is MatchedCaseStudy {
  return caseStudy.verdict.kind === "matched";
}

function assertArtifactAgreement(name: DatasetName, raw: RawArtifacts): void {
  const timelineKeys = Object.keys(raw.timelines).sort();
  const comparisonKeys = Object.keys(raw.comparison).sort();

  if (
    timelineKeys.length !== comparisonKeys.length ||
    timelineKeys.some((key, index) => key !== comparisonKeys[index])
  ) {
    throw new Error(`${name}: timeline and comparison artifact keys differ`);
  }

  const eventCount = Object.values(raw.timelines).reduce(
    (total, timeline) => total + timeline.events.length,
    0,
  );

  if (eventCount !== raw.metrics.n_events) {
    throw new Error(
      `${name}: flattened event count ${eventCount} differs from metrics.n_events ${raw.metrics.n_events}`,
    );
  }

  if (timelineKeys.length !== raw.metrics.n_clusters) {
    throw new Error(
      `${name}: timeline count ${timelineKeys.length} differs from metrics.n_clusters ${raw.metrics.n_clusters}`,
    );
  }

  const matchedCount = Object.values(raw.comparison).filter(
    (comparison) => comparison.matched,
  ).length;

  if (matchedCount !== raw.metrics.coverage.covered) {
    throw new Error(
      `${name}: matched count ${matchedCount} differs from metrics.coverage.covered ${raw.metrics.coverage.covered}`,
    );
  }
}

// Each directory is spelled out so the bundler traces three folders, not the repo.
function artifactDir(name: DatasetName): string {
  switch (name) {
    case "development":
      return join(process.cwd(), "out");
    case "holdout":
      return join(process.cwd(), "out-holdout");
    case "board":
      return join(process.cwd(), "out-board");
  }
}

function readArtifacts(name: DatasetName): RawArtifacts | null {
  const dir = artifactDir(name);
  if (!existsSync(join(dir, "metrics.json"))) {
    return null;
  }
  const read = <T,>(file: string): T =>
    JSON.parse(readFileSync(join(dir, file), "utf8")) as T;
  return {
    timelines: read<Record<string, RawTimeline>>("timelines.json"),
    comparison: read<Record<string, RawComparison>>("comparison.json"),
    metrics: read<RawMetrics>("metrics.json"),
  };
}

function buildDossier(name: DatasetName, raw: RawArtifacts): Dossier {
  assertArtifactAgreement(name, raw);

  const cases: CaseStudy[] = Object.entries(raw.timelines).map(
    ([id, timeline]) => {
      const parsedEvents = timeline.events
        .map((event, index) => parseEvent(event, `${id}.events[${index}]`))
        .sort((a, b) => a.date.localeCompare(b.date));
      const [firstEvent, ...remainingEvents] = parsedEvents;

      if (!firstEvent) {
        throw new Error(`Timeline ${id} has no events`);
      }

      return {
        category: timeline.category,
        district: timeline.district,
        events: [firstEvent, ...remainingEvents],
        firstDate: parseIsoDate(timeline.first_date, `${id}.first_date`),
        id,
        initiative: timeline.initiative_name,
        lastDate: parseIsoDate(timeline.last_date, `${id}.last_date`),
        verdict: parseVerdict(id, raw.comparison[id]),
      };
    },
  );

  const orderedCases = cases.toSorted(
    (a, b) =>
      Number(b.verdict.kind === "matched") -
        Number(a.verdict.kind === "matched") ||
      a.district.localeCompare(b.district) ||
      a.firstDate.localeCompare(b.firstDate),
  );
  const matchedCases = orderedCases.filter(isMatchedCase);
  const hit = matchedCases.reduce<MatchedCaseStudy | null>(
    (featured, current) =>
      featured === null ||
      current.verdict.leadDays > featured.verdict.leadDays
        ? current
        : featured,
    null,
  );
  const allDates: IsoDate[] = [];

  for (const caseStudy of orderedCases) {
    allDates.push(...caseStudy.events.map((event) => event.date));
    if (caseStudy.verdict.kind !== "noOutcome") {
      allDates.push(caseStudy.verdict.outcome.date);
    }
  }

  const sortedDates = allDates.toSorted();
  const span =
    sortedDates.length === 0
      ? null
      : {
          max: sortedDates[sortedDates.length - 1],
          min: sortedDates[0],
        };
  const metrics: DossierMetrics = {
    clusters: raw.metrics.n_clusters,
    controls: {
      fired: raw.metrics.control_fp.firing_districts,
      multiEventClusters: raw.metrics.control_fp.n_multi_event_clusters,
      rate: raw.metrics.control_fp.rate,
      total: raw.metrics.control_fp.control_districts,
    },
    coverage: raw.metrics.coverage,
    docs: raw.metrics.n_docs,
    events: raw.metrics.n_events,
    linkThreshold: raw.metrics.threshold,
    matches: matchedCases.length,
    matchFloor: raw.metrics.match_threshold,
    medianLeadDays: raw.metrics.median_lead_days,
    precision: raw.metrics.precision,
  };

  return {
    cases: orderedCases,
    hit,
    metrics,
    scoreboard: {
      controls: {
        fired: metrics.controls.fired,
        total: metrics.controls.total,
      },
      purchasers: {
        covered: metrics.coverage.covered,
        total: metrics.coverage.total,
      },
    },
    span,
  };
}

const dossiers = new Map<DatasetName, Dossier | null>();

/** Parse, join, classify, and derive one run's dossier; null when that run has not happened. */
export function loadDossier(name: DatasetName): Dossier | null {
  if (!dossiers.has(name)) {
    const raw = readArtifacts(name);
    dossiers.set(name, raw === null ? null : buildDossier(name, raw));
  }
  return dossiers.get(name) ?? null;
}

/** The development run is committed and must exist. */
export function requireDossier(name: DatasetName): Dossier {
  const dossier = loadDossier(name);
  if (dossier === null) {
    throw new Error(`Missing pipeline artifacts for the ${name} run (${DATASET_DIRS[name]}/)`);
  }
  return dossier;
}

/** Return a clamped 0..100 position on a date span. */
export function timeScale(span: DateSpan): (date: IsoDate) => number {
  const min = toUtcDate(span.min).getTime();
  const max = toUtcDate(span.max).getTime();

  if (min === max) {
    return () => 50;
  }

  return (date) => {
    const position = ((toUtcDate(date).getTime() - min) / (max - min)) * 100;
    return Math.min(100, Math.max(0, position));
  };
}

export function monthTicks(span: DateSpan): IsoDate[] {
  const start = toUtcDate(span.min);
  const end = toUtcDate(span.max);
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  const ticks: IsoDate[] = [];

  while (cursor < end) {
    ticks.push(
      parseIsoDate(
        cursor.toISOString().slice(0, 10),
        "derived month tick",
      ),
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return ticks;
}

export function formatDate(date: IsoDate): string {
  return dateFormatter.format(toUtcDate(date));
}

export function formatCount(count: number, capitalize = false): string {
  const value = countWords[count] ?? String(count);
  return capitalize ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function formatMonth(date: IsoDate): string {
  return monthFormatter.format(toUtcDate(date));
}

export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount);
}

export function formatPercent(rate: number): string {
  return percentFormatter.format(rate);
}

export function formatSimilarity(similarity: number): string {
  return similarity.toFixed(2);
}
