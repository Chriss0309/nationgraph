import comparisonRaw from "@/out/comparison.json";
import metricsRaw from "@/out/metrics.json";
import timelinesRaw from "@/out/timelines.json";

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
  precision: { correct: number; labeled: number; rate: number };
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

type RawComparison = (typeof comparisonRaw)[keyof typeof comparisonRaw];
type RawTimeline = (typeof timelinesRaw)[keyof typeof timelinesRaw];
type RawEvent = RawTimeline["events"][number];

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

function assertArtifactAgreement(): void {
  const timelineKeys = Object.keys(timelinesRaw).sort();
  const comparisonKeys = Object.keys(comparisonRaw).sort();

  if (
    timelineKeys.length !== comparisonKeys.length ||
    timelineKeys.some((key, index) => key !== comparisonKeys[index])
  ) {
    throw new Error("Timeline and comparison artifact keys differ");
  }

  const eventCount = Object.values(timelinesRaw).reduce(
    (total, timeline) => total + timeline.events.length,
    0,
  );

  if (eventCount !== metricsRaw.n_events) {
    throw new Error(
      `Flattened event count ${eventCount} differs from metrics.n_events ${metricsRaw.n_events}`,
    );
  }

  if (timelineKeys.length !== metricsRaw.n_clusters) {
    throw new Error(
      `Timeline count ${timelineKeys.length} differs from metrics.n_clusters ${metricsRaw.n_clusters}`,
    );
  }

  const matchedCount = Object.values(comparisonRaw).filter(
    (comparison) => comparison.matched,
  ).length;

  if (matchedCount !== metricsRaw.coverage.covered) {
    throw new Error(
      `Matched count ${matchedCount} differs from metrics.coverage.covered ${metricsRaw.coverage.covered}`,
    );
  }
}

function buildDossier(): Dossier {
  assertArtifactAgreement();

  const cases: CaseStudy[] = Object.entries(timelinesRaw).map(
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
        verdict: parseVerdict(id, comparisonRaw[id as keyof typeof comparisonRaw]),
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
    clusters: metricsRaw.n_clusters,
    controls: {
      fired: metricsRaw.control_fp.firing_districts,
      multiEventClusters: metricsRaw.control_fp.n_multi_event_clusters,
      rate: metricsRaw.control_fp.rate,
      total: metricsRaw.control_fp.control_districts,
    },
    coverage: metricsRaw.coverage,
    docs: metricsRaw.n_docs,
    events: metricsRaw.n_events,
    linkThreshold: metricsRaw.threshold,
    matches: matchedCases.length,
    matchFloor: metricsRaw.match_threshold,
    medianLeadDays: metricsRaw.median_lead_days,
    precision: metricsRaw.precision,
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

const dossier = buildDossier();

/** Parse, join, classify, and derive the build-time dossier. */
export function loadDossier(): Dossier {
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
