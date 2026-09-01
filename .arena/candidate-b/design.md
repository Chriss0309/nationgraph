# Candidate B: The evidence rewind

## Problem

The page must make one argument in a fixed order. The RFP is a late signal, ordinary board records can expose intent earlier, the prototype tests that claim with quoted evidence, one case worked, and coverage remains thin. The current page starts inside the machinery and looks like a results dashboard. That shape hides the commercial problem, flattens the method, and makes a small dataset feel merely sparse. This design turns the page into a public-record receipt. Orange marks the RFP cutoff. Green marks evidence found before it. The signature motion runs backward from the orange cutoff to the earlier green source, so the interface performs the thesis instead of decorating it.

The aesthetic is paper-trail minimalism. It uses NationGraph's light background, thin rules, system heading face, Geist body, green evidence marks, and one orange warning. It rejects stat tiles, ornamental gradients, and a generic chart dashboard.

## Usage (caller's view)

The page caller gets one validated domain model. It does not know the JSON shapes, join rules, date parsing, matching states, or copy formatting.

```tsx
// app/page.tsx, usage sketch only
import { ResultsPage } from "@/components/results/results-page";
import { getResultsPageModel } from "@/lib/results-model";

export default function Page() {
  return <ResultsPage model={getResultsPageModel()} />;
}
```

`ResultsPage` passes narrow domain slices to the visual system. It does not coordinate raw records.

```tsx
// components/results/results-page.tsx, usage sketch only
<CutoffRail proof={model.primaryProof} />
<MethodFlow summary={model.method} />
<RewindProof proof={model.primaryProof} />
<BacktestVerdict validation={model.validation} />
<CoverageWindow coverage={model.coverage} />
```

The audit section receives joined cases. It never looks up a comparison by cluster ID during render.

```tsx
// components/results/results-page.tsx, usage sketch only
<EvidenceLedger cases={model.cases} thresholds={model.thresholds} />
```

This is the whole rendering interface. Data import and interpretation stay behind `getResultsPageModel()`.

## Shape

### Concept

**The evidence rewind.** Open on the orange RFP cutoff, explain why it is late, then rewind through the public record until the green source document appears. Forward motion belongs only to the method. Evidence motion always runs backward.

The page has one visual grammar:

- Orange means the procurement moment when vendors are already late.
- Core green means a source-backed signal found before that moment.
- Dark ink means a verified statement.
- Gray means searched material, controls, or missing coverage.
- A solid line means verified chronology. A dotted line means a tested relationship.
- A quote bracket means the text passed the verbatim-evidence gate.

No number floats in a decorative stat card. Every number sits next to the evidence or limitation it describes.

### Page structure and actual copy

#### Masthead

Layout: a quiet wordmark row above the hero. No navigation and no call-to-action button. A thin border separates it from the argument.

Copy:

> NATIONGRAPH
>
> Research prototype

#### Problem: the cutoff

Layout: a two-column hero. The left column contains the argument. The right column contains the animated cutoff rail. On small screens, copy precedes the rail.

Copy:

> PUBLIC-SECTOR CYBERSECURITY
>
> # The RFP is too late.
>
> Vendors usually learn about a purchase when the RFP drops. By then, requirements are written and incumbents are in.

Cutoff rail labels:

> Board record
>
> RFP published
>
> Vendor enters
>
> Too late

The orange `RFP published` rule is the only strong warm color above the fold. The green board-record mark sits visibly before it.

#### Thesis: look upstream

Layout: a short statement with generous empty space. A hairline continues from the green board-record mark into this section, making it feel like the reader has followed the signal upstream.

Copy:

> THE THESIS
>
> ## Buying intent appears earlier.
>
> Agendas, minutes, and budgets can reveal the purchase while it is still taking shape.
>
> Look upstream.

This section is intentionally not a card and does not introduce another chart. It gives the idea room before the method begins.

#### Method: quote, link, test

Layout: one full-width process strip. It reads left to right because this is the only forward process on the page. The strip starts as a dense field of document marks and ends as a backtest gate.

Copy:

> THE TEST
>
> ## Start with public records. Keep only what can be quoted.
>
> The prototype links related events, then checks them against later solicitations.

Stage labels:

> 124 source documents
>
> 4 verbatim-quoted events
>
> 4 linked trajectories
>
> Backtest against later RFPs

Method note:

> District, date, and source come from the ledger. Every source predates its outcome.

Collapsed audit note:

> Extraction floor 0.78. Match floor 0.5.

#### Result: the rewind

Layout: the largest visual on the page. The title sits above a wide timeline. The orange RFP receipt appears on the right first. The connecting line then draws right to left until it reaches the green board receipt. This is the memorable moment.

Copy:

> THE HIT
>
> ## A firewall signal, 317 days early.
>
> Charlotte County Public Schools approved a firewall software RFP request on Mar 9, 2021. The official firewall solicitation dropped Jan 20, 2022.

Timeline labels:

> Jan 20, 2022
>
> Official firewall solicitation
>
> 317 days
>
> Mar 9, 2021
>
> Board approved a firewall software RFP request

Green source receipt:

> BOARD AGENDA PACKET
>
> 20/21-40GH Sinnott Wolach Technology Firewall Software, eRate LTT 37939708007400691 $179,820
>
> Sinnott Wolach Technology
>
> $179,820

Orange outcome receipt:

> RFP
>
> Firewall Services, per FCC USAC's E-rate Program
>
> Open outcome

The source quote appears exactly as stored. It is not wrapped in editorial quotation marks, because those marks are not part of the source.

#### Backtest: hit and controls

Layout: one horizontal verdict band below the proof. The precision link occupies the left side. The control scan occupies the right side. Both use the same baseline, so the viewer compares a firing positive with quiet controls.

Copy:

> BACKTEST
>
> ## One hit. No control alarms.
>
> Hand review marked the matched signal correct. None of the control districts fired.

Precision labels:

> 1/1 correct
>
> Matched signal
>
> Known purchase

Control labels:

> 0/3 controls fired
>
> 0 false alarms
>
> Control districts stayed quiet

Do not show a gauge or a celebratory success color wash. The result is encouraging, but the sample is too small for that visual tone.

#### Limitation: the missing trails

Layout: a coverage window made of five tall slots. One slot fills green. The remaining slots stay as empty outlines. The large empty area is the point.

Copy:

> THE LIMIT
>
> ## It found 1 of 5 known purchases.
>
> The sample missed most buying trails. The next gain is more documents, not a smarter model.

Coverage labels:

> 1/5 coverage
>
> 20%
>
> Found
>
> Not visible in the sample

The empty slots do not get invented district names, categories, or causes. The output only establishes that those known purchases were not covered.

#### Evidence ledger

Layout: a ruled list, not a grid of cards. Every row shows the district, initiative, date, state, and decision. Native `details` reveals the summary, exact quote, source reference, and comparison details. The matched row begins open. The others begin closed.

Intro copy:

> THE RECORD
>
> ## Audit the result.
>
> 4 extracted events. 4 trajectories. Every event keeps its exact source quote.

Row copy and expanded content:

**Charlotte County Public Schools**

> Firewall Software
>
> Mar 9, 2021 · Solicitation · Matched
>
> Approved the request for proposals for firewall software.
>
> 20/21-40GH Sinnott Wolach Technology Firewall Software, eRate LTT 37939708007400691 $179,820
>
> Vendor: Sinnott Wolach Technology
>
> Amount: $179,820
>
> Source: board agenda packet · data/raw/charlotte_2022_01_20/boarddocs/packets/2021-03-09_BVGM285892F0_Regular_School_Board_Meeting.html
>
> Outcome: Firewall Services, per FCC USAC's E-rate Program
>
> Similarity: 0.5959 · Match floor: 0.5 · Lead: 317 days

**Charlotte County Public Schools**

> URL/Web Content Filtering and Monitoring
>
> May 11, 2021 · Solicitation · Not matched
>
> Approved the Invitation to Negotiate for URL/web content filtering and monitoring services.
>
> INVITATION TO NEGOTIATE: Number Vendor Description Amount 20/21 - 44GH United Data Technologies Partnered with Lightspeed Systems URL/Web Content Filtering & Monitoring
>
> Vendor: United Data Technologies partnered with Lightspeed Systems
>
> Amount: $78,499
>
> Source: board agenda packet · data/raw/charlotte_2022_01_20/boarddocs/packets/2021-05-11_BVGM9J596566_Regular_School_Board_Meeting.html
>
> Similarity: 0.4075 · Match floor: 0.5

**Citrus County School District**

> Securly Web Filtering and Monitoring
>
> Dec 8, 2020 · Authorization · No outcome in the ledger
>
> Approved a three-year license for Securly Web Filtering and additional 24/7 monitoring of negative emotional sentiment.
>
> Approval is requested for the purchase of Securly Web Filtering of student and staff devices. We are also seeking approval for the additional 24/7 Monitoring of negative, emotional sentiment.
>
> Vendor: Securly
>
> Amount: $227,000
>
> Source: board agenda · data/raw/control_citrus/boarddocs/agendas/2020-12-08_BT4L2C546C6F.html

**Miami-Dade County Public Schools**

> Cyber Liability Insurance Renewal
>
> Jun 23, 2021 · Renewal · Not matched
>
> Requested authorization to renew existing cyber liability coverage.
>
> REQUEST AUTHORIZATION TO RENEW EXISTING COVERAGES INCLUDING CATASTROPHIC ATHLETIC ACCIDENT COVERAGE, LAW ENFORCEMENT PROFESSIONAL LIABILITY INSURANCE, EXCESS WORKERS’ COMPENSATION INSURANCE, GENERAL/AUTOMOBILE/PROFESSIONAL LIABILITY INSURANCE, BOILER AND MACHINERY COVERAGE, CYBER LIABILITY COVERAGE
>
> Vendor not identified.
>
> Amount not identified.
>
> Source: meeting agenda · data/raw/miami_dade_2022_04_15/board_archive/2021-06-23/9335bc78315e404b__regular-agenda.html
>
> Similarity: 0.3392 · Match floor: 0.5

Local source references render as paths, not broken anchors. Web outcomes render as external links with visible focus and external-link text.

#### Footer receipt

Copy:

> Research prototype. Backtested, not a live forecast.
>
> 124 documents · 4 events · 4 trajectories · extraction floor 0.78 · match floor 0.5
>
> Know before the RFP drops.
>
> © NationGraph

### Visualization specifications

#### Cutoff rail

Purpose: explain the problem before explaining the product.

Data fields:

- `primaryProof.signal.source.sourceType` supplies `Board record`.
- `primaryProof.comparison.outcome.outcomeType` supplies `RFP`.
- The marks are ordinal. This rail does not claim a proportional time scale.

Technique:

- Render one accessible SVG with a horizontal baseline and two vertical marks.
- Define the path from the orange RFP mark back toward the green source mark, matching the later rewind grammar.
- On initial load, animate the baseline with `stroke-dasharray: 1` and `stroke-dashoffset`.
- Draw the orange rule with `transform: scaleY(0)` to `scaleY(1)`, using `transform-origin: bottom`.
- Move the neutral `Vendor enters` dot toward the orange rule with `transform: translateX(...)`; stop it exactly at the rule.
- Reveal the earlier green source dot last with a single `scale` and opacity pulse. Do not loop.
- Use named keyframes `cutoff-line`, `cutoff-gate`, `vendor-arrive`, and `source-found`. Run them for `480ms`, `300ms`, `650ms`, and `220ms` with `cubic-bezier(.22,1,.36,1)`, staggered in that order.
- Keep all labels in HTML around the SVG so they remain readable when SVG animation is unavailable.

Five-second takeaway: vendors enter at the orange RFP cutoff, while a public record already exists to its left.

#### Document-to-evidence flow

Purpose: show the reduction from searched material to a small, auditable result without pretending the dataset is large.

Data fields:

- `method.documentCount` from `metrics.n_docs`
- `method.eventCount` from `metrics.n_events`
- `method.trajectoryCount` from `metrics.n_clusters`
- `thresholds.extraction` from `metrics.threshold`
- `thresholds.match` from `metrics.match_threshold`

Technique:

- Server-render exactly `documentCount` tiny neutral SVG rectangles in a fixed grid. Their arrangement carries no chronology.
- Reveal the grid through an SVG `clipPath` whose rectangle expands left to right.
- Render exactly `eventCount` green quote-bracket glyphs in the next stage. Pop them in with staggered opacity and `transform: translateY`.
- Render exactly `trajectoryCount` short green rails in the linking stage. Draw each rail with `pathLength="1"`, `stroke-dasharray: 1`, and `stroke-dashoffset`.
- Connect stages with one SVG path per transition. The backtest gate is a thin outlined rectangle, not a funnel cone.
- Use `documents-reveal 700ms ease-out`, then `quote-rise 360ms ease-out`, `trajectory-draw 500ms ease-out`, and `backtest-gate 280ms ease-out`. Stagger quote and trajectory marks with standard inline `animation-delay`, never dynamic class names.
- Trigger once with `animation-timeline: view()` and `animation-range: entry 15% cover 45%`.
- Under `@supports not (animation-timeline: view())`, render the final state. The explanation never depends on motion.

Five-second takeaway: many documents produce a few quote-backed events, those events become trajectories, and only then are they tested.

#### Firewall evidence rewind

Purpose: make the proven lead time the page's visual center.

Data fields:

- `proof.signal.date`
- `proof.signal.action`
- `proof.signal.evidence`
- `proof.signal.vendor`
- `proof.signal.amountUsd`
- `proof.comparison.outcome.date`
- `proof.comparison.outcome.title`
- `proof.comparison.leadDays`

Technique:

- Use an SVG view box with the outcome endpoint on the right and the source endpoint on the left.
- Define the main path from right to left. Set `pathLength="1"`, `stroke-dasharray: 1`, and animate `stroke-dashoffset: 1` to `0`.
- Paint the main path core green. Keep the RFP endpoint orange and the source endpoint green.
- Reveal the orange outcome receipt first. Run the reverse path next. Scale in the green source receipt at the final beat.
- Place the `leadDays` label at the geometric midpoint in HTML, over a background-colored patch that interrupts the line.
- Dates remain visible before animation. Motion only reveals the relationship.
- Use `outcome-arrive 240ms ease-out`, `evidence-rewind 1200ms cubic-bezier(.22,1,.36,1)`, and `source-reveal 320ms ease-out`, in that order. No scrubbed number count and no repeated pulse.

Five-second takeaway: the official RFP arrived 317 days after a citable board action.

#### Precision link

Purpose: show what `1/1 correct` means instead of presenting an unexplained percentage.

Data fields:

- `validation.precision.correct`
- `validation.precision.labeled`

Technique:

- Generate one source slot per labeled result and one outcome slot per correct result.
- For the current data, render a single green source dot, a dotted connector, and a dark-green outcome ring.
- Draw the connector with SVG `stroke-dashoffset`, then add a small check notch using two CSS-bordered spans.
- Use `precision-link 500ms ease-out` and reveal the check notch with `precision-check 180ms ease-out` after the path completes.
- Keep `1/1 correct` as HTML text. Do not animate the number.

Five-second takeaway: the only hand-labeled match was correct.

#### Control quiet scan

Purpose: make an absence legible without turning it into a triumphant score.

Data fields:

- `validation.controls.firingDistricts`
- `validation.controls.totalDistricts`

Technique:

- Server-render one narrow lane per control district. The output does not expose names, so use unlabeled lanes.
- A translucent green scan bar crosses all lanes once with `transform: translateX`.
- A firing lane would leave a filled marker. The current `firingDistricts` value leaves every lane hollow.
- Use `control-scan 900ms cubic-bezier(.22,1,.36,1)`. Fade in the text verdict with `control-verdict 240ms ease-out` only after the scan finishes.
- The final static state contains all information. The scan merely explains that every lane was checked.

Five-second takeaway: the control set was checked and no district fired.

#### Coverage window

Purpose: turn the limitation into a first-class result.

Data fields:

- `coverage.count`
- `coverage.total`
- The displayed rate is derived from `coverage.count / coverage.total`. The loader validates it against the stored raw rate.

Technique:

- Render exactly `total` vertical slots with CSS grid.
- Fill exactly `count` slots using core green. Leave the rest as thin gray outlines.
- Reveal every slot first. Fill the covered slots second. Then lower the opacity of uncovered slots slightly, preserving their borders.
- Animate with `clip-path: inset(100% 0 0)` to `inset(0)` and staggered standard `animation-delay` values.
- Use `coverage-slot 420ms ease-out`, `coverage-found 280ms ease-out`, and `coverage-missing 240ms ease-out`.
- Keep the fraction and percentage in visible HTML. The graph never stands alone.

Five-second takeaway: the signal was real, but coverage reached only one known purchase.

### Motion system

Motion has two directions. The method moves left to right. Evidence moves right to left. That rule is more important than any individual easing curve.

- Entrance motion uses opacity and no more than a few pixels of translation.
- Data marks animate once as their section enters.
- Nothing loops except a focus-visible indicator supplied by the browser.
- `prefers-reduced-motion: reduce` removes transforms, transitions, view timelines, and delayed reveals. Every visual lands in its final state.
- Scroll-driven animation is progressive enhancement. Unsupported browsers receive the complete static graphic.
- Visual order never changes DOM order.

### Visual system

- Page background: `#fafafa`
- Card and receipt paper: `#fdfdfd`
- Primary ink: `#191818`
- Muted ink: `#6a6b67`
- Rules: `#dcdcdb`
- Evidence green: `#2d8657`
- Dark evidence green: `#133925`
- Soft evidence field: `#ecf9f2`
- RFP cutoff orange: `#f4900a`
- Headings: `"Helvetica Neue", Arial, sans-serif`
- Body: Geist through `next/font/google`
- Metadata: Geist Mono through `next/font/google`

Receipts use square corners or a very small radius. They get one-pixel borders and no shadow. Section spacing supplies hierarchy. Orange never fills a whole section.

Event state does not introduce a rainbow. `EVENT_STATE_META` combines a label with a shape and a green or neutral tone. Color is never the only state cue:

- Discussion: hollow circle, neutral
- Workshop: hollow diamond, neutral
- Budget: square, soft green
- Authorization: square with center dot, core green
- Solicitation: solid circle, core green
- Award: solid diamond, dark green
- Renewal: double ring, core green
- Other: short dash, neutral

### Responsive behavior

- Desktop uses a wide editorial measure with the proof timeline spanning the content width.
- At tablet width, receipt endpoints stay side by side while supporting copy moves above them.
- On mobile, the rewind timeline becomes vertical. The orange RFP receipt appears first, then a line draws upward to the earlier green board receipt. Reading order remains problem, thesis, method, result, limitation, evidence.
- The document grid reduces its column count but still renders the exact document total.
- The evidence ledger keeps dates and decisions visible. Long initiative names wrap instead of truncating.

### Accessibility

- Every section has a heading and an `aria-labelledby` relationship.
- Every data SVG has a short `<title>` and a plain-language `<desc>`.
- A visually hidden sentence repeats each chart's conclusion.
- Dates use `<time dateTime="...">`.
- Amounts use tabular numerals.
- Native `details` and `summary` provide keyboard access to evidence without a client component.
- Links state when they open an external outcome. Local source paths are selectable text.
- Focus uses the NationGraph green ring with sufficient offset from thin rules.
- Orange and green are always paired with labels, shapes, or position.

### Copy provenance

All page-facing numbers come from the three committed output files:

- Method counts and thresholds come from `out/metrics.json`.
- Coverage, precision, and control values come from `out/metrics.json`.
- Event dates, amounts, quotes, states, vendors, and action text come from `out/timelines.json`.
- Outcome dates, titles, types, similarities, and lead time come from `out/comparison.json`.
- `20%` formats `metrics.coverage.rate`.
- `1/5`, `1/1`, and `0/3` pair the stored numerator and denominator fields.
- The page does not use numeric claims from `README.md`.

### Core typed model

Wire types stay private to the loader. The UI sees domain states that cannot combine a matched flag with a missing outcome.

```ts
type ClusterId = string & { readonly __brand: "ClusterId" };
type IsoDate = string & { readonly __brand: "IsoDate" };
type NonEmptyText = string & { readonly __brand: "NonEmptyText" };

type EventState =
  | "DISCUSSION"
  | "WORKSHOP"
  | "BUDGET"
  | "AUTHORIZATION"
  | "SOLICITATION"
  | "AWARD"
  | "RENEWAL"
  | "OTHER";

type SourceRef =
  | { readonly kind: "web"; readonly href: URL; readonly sourceType: NonEmptyText }
  | { readonly kind: "local"; readonly path: NonEmptyText; readonly sourceType: NonEmptyText };

type EvidenceEvent = {
  readonly date: IsoDate;
  readonly state: EventState;
  readonly action: NonEmptyText;
  readonly summary: NonEmptyText;
  readonly evidence: NonEmptyText;
  readonly vendor: NonEmptyText | null;
  readonly amountUsd: number | null;
  readonly source: SourceRef;
};

type Outcome = {
  readonly title: NonEmptyText;
  readonly outcomeType: NonEmptyText;
  readonly date: IsoDate;
  readonly url: URL;
};

type ComparisonDecision =
  | {
      readonly kind: "matched";
      readonly similarity: number;
      readonly outcome: Outcome;
      readonly leadDays: number;
    }
  | {
      readonly kind: "below-match-floor";
      readonly similarity: number;
      readonly candidateOutcome: Outcome;
      readonly candidateLeadDays: number;
    }
  | {
      readonly kind: "no-outcome";
    };

type CaseStudy = {
  readonly id: ClusterId;
  readonly district: NonEmptyText;
  readonly initiativeName: NonEmptyText;
  readonly category: NonEmptyText;
  readonly firstDate: IsoDate;
  readonly lastDate: IsoDate;
  readonly events: readonly [EvidenceEvent, ...EvidenceEvent[]];
  readonly comparison: ComparisonDecision;
};

type MatchedCase = CaseStudy & {
  readonly comparison: Extract<ComparisonDecision, { kind: "matched" }>;
  readonly signal: EvidenceEvent;
};

type CountRatio = {
  readonly count: number;
  readonly total: number;
};

type MethodSummary = {
  readonly documentCount: number;
  readonly eventCount: number;
  readonly trajectoryCount: number;
};

type ValidationSummary = {
  readonly precision: {
    readonly correct: number;
    readonly labeled: number;
  };
  readonly controls: {
    readonly firingDistricts: number;
    readonly totalDistricts: number;
  };
};

type ResultsPageModel = {
  readonly method: MethodSummary;
  readonly primaryProof: MatchedCase;
  readonly validation: ValidationSummary;
  readonly coverage: CountRatio;
  readonly thresholds: {
    readonly extraction: number;
    readonly match: number;
  };
  readonly cases: readonly CaseStudy[];
};

type ParsedMetrics = {
  readonly method: MethodSummary;
  readonly validation: ValidationSummary;
  readonly coverage: CountRatio;
  readonly storedCoverageRate: number;
  readonly storedPrecisionRate: number;
  readonly medianLeadDays: number | null;
  readonly thresholds: ResultsPageModel["thresholds"];
};

type ParsedTrajectory = Omit<CaseStudy, "comparison">;

type ParsedComparison = {
  readonly id: ClusterId;
  readonly decision: ComparisonDecision;
};
```

The current artifact has one matched case, so `primaryProof` is required. Its `signal` is the earliest dated event in that matched trajectory. The loader must fail the build with a clear dataset error if the matched-case count is not one or if stored metrics disagree with joined cases. That is deliberate. Publishing a polished but internally inconsistent research receipt is worse than failing the build.

Registries hold policy in one place:

```ts
type EventStateMeta = {
  readonly label: string;
  readonly glyph: "circle" | "diamond" | "square" | "square-dot" | "double-ring" | "dash";
  readonly tone: "neutral" | "soft-green" | "green" | "dark-green";
};

const EVENT_STATE_META: Record<EventState, EventStateMeta> = {
  DISCUSSION: { label: "Discussion", glyph: "circle", tone: "neutral" },
  WORKSHOP: { label: "Workshop", glyph: "diamond", tone: "neutral" },
  BUDGET: { label: "Budget", glyph: "square", tone: "soft-green" },
  AUTHORIZATION: { label: "Authorization", glyph: "square-dot", tone: "green" },
  SOLICITATION: { label: "Solicitation", glyph: "circle", tone: "green" },
  AWARD: { label: "Award", glyph: "diamond", tone: "dark-green" },
  RENEWAL: { label: "Renewal", glyph: "double-ring", tone: "green" },
  OTHER: { label: "Other", glyph: "dash", tone: "neutral" },
};

type SectionId =
  | "problem"
  | "thesis"
  | "method"
  | "proof"
  | "validation"
  | "limitation"
  | "evidence";

const SECTION_ORDER: readonly SectionId[] = [
  "problem",
  "thesis",
  "method",
  "proof",
  "validation",
  "limitation",
  "evidence",
];
```

Components receive `tone` and `glyph`, then emit complete literal class names or stable data attributes. They never assemble Tailwind class strings from data.

### Signatures and data flow

Only `getResultsPageModel` is public outside the results feature.

```ts
export function getResultsPageModel(): ResultsPageModel {
  throw new Error("not implemented");
}

function parseMetrics(input: unknown): ParsedMetrics {
  throw new Error("not implemented");
}

function parseTimelines(input: unknown): readonly ParsedTrajectory[] {
  throw new Error("not implemented");
}

function parseComparisons(input: unknown): readonly ParsedComparison[] {
  throw new Error("not implemented");
}

function joinCases(input: {
  readonly trajectories: readonly ParsedTrajectory[];
  readonly comparisons: readonly ParsedComparison[];
  readonly matchFloor: number;
}): readonly CaseStudy[] {
  throw new Error("not implemented");
}

function selectPrimaryProof(cases: readonly CaseStudy[]): MatchedCase {
  throw new Error("not implemented");
}

function assertMetricAgreement(input: {
  readonly metrics: ParsedMetrics;
  readonly cases: readonly CaseStudy[];
}): void {
  throw new Error("not implemented");
}

export function ResultsPage(props: {
  readonly model: ResultsPageModel;
}): React.ReactElement {
  throw new Error("not implemented");
}

function CutoffRail(props: {
  readonly proof: MatchedCase;
}): React.ReactElement {
  throw new Error("not implemented");
}

function MethodFlow(props: {
  readonly summary: MethodSummary;
}): React.ReactElement {
  throw new Error("not implemented");
}

function RewindProof(props: {
  readonly proof: MatchedCase;
}): React.ReactElement {
  throw new Error("not implemented");
}

function BacktestVerdict(props: {
  readonly validation: ValidationSummary;
}): React.ReactElement {
  throw new Error("not implemented");
}

function CoverageWindow(props: {
  readonly coverage: CountRatio;
}): React.ReactElement {
  throw new Error("not implemented");
}

function EvidenceLedger(props: {
  readonly cases: readonly CaseStudy[];
  readonly thresholds: ResultsPageModel["thresholds"];
}): React.ReactElement {
  throw new Error("not implemented");
}
```

Loader pseudocode:

```text
import the three JSON artifacts inside the server-only model module
parse each artifact from unknown into private validated records
validate ISO dates, finite counts, ratios, URLs, states, non-empty quotes no longer than 300 characters, and comparison nullability
join trajectories and comparisons once by branded cluster ID
translate raw matched flags into the ComparisonDecision union
verify metrics counts and rates agree with the joined domain cases
select the single matched proof and its earliest event for the current research artifact
freeze and return one ResultsPageModel
```

Dominant access patterns are direct:

- The page reads one model.
- The proof reads one already matched case.
- The ledger iterates one already joined case list.
- Visuals read small count objects.
- No component performs a cluster lookup, date parse, null-state reconstruction, or threshold comparison.

This is a deep interface. One zero-argument loader hides three wire formats, validation, joins, derived comparison states, metric cross-checks, date normalization, and proof selection. The caller remains one line, per interface depth and boundary discipline.

### Module map and server/client split

`app/page.tsx`, server component

- Replace the current monolith with the two-line caller shown above.
- Own only route composition.

`lib/results-model.ts`, server-only domain module

- Import all three JSON artifacts.
- Keep raw JSON types and validation helpers private.
- Join trajectories to comparisons.
- Cross-check stored metrics.
- Export `getResultsPageModel` and the domain types needed by server components.

`components/results/results-page.tsx`, server component

- Own narrative order, section copy, semantic headings, and composition.
- Export only `ResultsPage`.

`components/results/result-visuals.tsx`, server components

- Own the cutoff rail, method flow, rewind proof, verdict band, and coverage window.
- Keep SVG coordinate and ARIA-description helpers private.
- Export the five visualization components only to `results-page.tsx`.

`components/results/evidence-ledger.tsx`, server component

- Own evidence row semantics, source-link behavior, date and currency formatting, and native `details`.
- No Base UI accordion and no hydration.

`app/globals.css`

- Replace the current approximate OKLCH palette with the supplied NationGraph tokens.
- Add complete literal utilities or component selectors for the visual system.
- Add the rewind, path-draw, scan, slot-reveal, and reduced-motion rules.
- Keep animation policy here rather than repeating keyframes in components.

`app/layout.tsx`, server component

- Remove Bricolage Grotesque, Instrument Sans, and Newsreader.
- Load Geist and Geist Mono with `next/font/google`.
- Map headings to the NationGraph system stack.
- Update metadata to the problem-first thesis.
- Metadata title: `Know before the RFP drops | NationGraph`.
- Metadata description: `A research prototype that backtests early cybersecurity buying signals in public school-board records.`

`components/ui/*`

- Leave unchanged.
- The redesign does not need card chrome, badges, separators, or hydrated accordion primitives. Plain semantic elements fit the receipt concept and avoid client JavaScript.

There are no new client components. CSS handles explanatory motion, and native `details` handles disclosure. This keeps the entire results page server rendered.

### Design red-flag screen

- No shallow public module: the page imports one loader and one page component.
- No wire leakage: imported JSON shapes never reach rendering components.
- No temporal decomposition: validation, joining, metric agreement, and proof selection live together because they own the dataset contract.
- No pass-through layer: `app/page.tsx` adapts the route to the results feature; the results component completes rendering.
- No repeated state policy: event labels and glyphs live in one exhaustive registry.
- No class-name synthesis: data selects typed tones and stable attributes, while CSS contains literal selectors.

## Synthesis decision

Arena synthesis is pending. Candidate B recommends the evidence-rewind shape as the base because it gives the page one unmistakable behavior: the proof animates from the too-late RFP back to the source document. The strongest graft points are the zero-client server architecture, the matched-versus-controls verdict band, and the limitation visual that reserves most of its area for what the sample missed.

## Tradeoffs accepted

- We accept a strongly directed narrative in exchange for immediate thesis clarity.
- We accept one orange accent with warning semantics in exchange for making the RFP cutoff unmistakable.
- We accept a build failure on inconsistent result artifacts in exchange for never publishing contradictory research metrics.
- We accept native `details` styling constraints in exchange for an evidence ledger with no client runtime.
- We accept a small number of purpose-built SVGs in exchange for motion that explains this dataset rather than a general chart system.
- We accept visible empty space in the coverage section in exchange for making the limitation impossible to overlook.
- We accept that the current design requires one primary matched proof in exchange for copy and motion tailored to the actual research result.

## Alternatives considered

### Results dashboard

A grid of KPI cards, filters, and a multi-row timeline would make scanning familiar, but it exposes the reader to metrics before explaining why they matter. It also asks the caller and the reader to assemble the argument from separate widgets. It hides little and loses on interface depth.

### Scrollytelling document stack

A pinned document facsimile with paragraphs highlighting as the user scrolls could make the evidence tactile. It would require client scroll coordination, multiple synchronized states, and more copy. That complexity would dominate a dataset with four events and weaken the NationGraph site's restrained visual language.

### Network graph

A node-link graph connecting districts, vendors, events, and outcomes fits the NationGraph name, but the current result has too few verified relationships. The graph would either look empty or imply links the data does not establish. It also makes the reader decode topology before learning the result.

### Conventional forward timeline

A left-to-right timeline from board event to RFP is accurate and simple. It lost because it illustrates chronology but does not embody the product insight. Drawing backward from the RFP turns "look earlier" into the page's defining behavior with no extra interaction.

## Open questions and risks

- Should the artifact deliberately fail when a pipeline rerun produces no single matched proof, or should it render a neutral no-hit state for exploratory runs?
- Does the local board packet path have a future public document URL, so the primary source receipt can become a real link?
- Should `0/3 controls fired` say "false alarms" or the more technical "false positives" after researcher review?
- Is the stored `metrics.threshold` correctly named for page copy as an extraction floor, or does it govern a different pipeline stage?
- Should the full all-caps Miami-Dade quote remain visually verbatim, or may CSS apply lowercase styling without changing the copied text?
- Are the controls intentionally anonymous in the public artifact, or should a future output file include their district names?

## Next implementation step

Build `lib/results-model.ts` first, with boundary validation and cross-artifact agreement checks, then render the static copy and final chart states before adding any motion.
