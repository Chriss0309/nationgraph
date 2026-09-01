# Candidate A — "Exhibit A": the results page as an evidence dossier

One-line concept: the page is an evidence dossier. The hero drops the measured number into the brand's own slogan — "Know 317 days before the RFP drops." — and proves it immediately with the actual verbatim line from the board packet. Green owns the early signal; orange appears only ever to mark the RFP moment (the "too late" moment). Every figure is an exhibit, not a chart.

## Problem

The prototype's story has five beats in a fixed order — problem (vendors learn at the RFP; too late), thesis (intent is visible in board paper first), method (124 docs → verbatim-quoted events → linked trajectories → leakage-safe backtest), result (317-day hit, 0/3 controls, 1/1 precision), and an honest limitation (1/5 coverage; more data, not a smarter model). The baseline page tells almost none of it: no problem framing, invisible method, no limitation, one static dot strip. Constraints that shape the design: all numbers must come from `out/metrics.json` / `out/timelines.json` / `out/comparison.json` imported at build time (README prose is stale); Next 16 App Router, server components by default; Tailwind v4 with literal class names; `tw-animate-css` available; zero new dependencies, hand-built SVG/CSS visualizations, CSS-only animation strongly preferred; `prefers-reduced-motion` respected; the dataset is 4 events and the design must make small-and-verified feel rigorous, not fake scale; brand must match nationgraph.com (Helvetica Neue headings, Geist body, green scale on light neutrals, thin `#dcdcdb` borders, orange `#f4900a` used sparingly).

## Usage (caller's view)

The consumer is `app/page.tsx` (server component). It calls one loader and composes sections; no component ever touches the raw JSON.

```tsx
// app/page.tsx (server) — the whole page
import { loadDossier } from "@/lib/dossier";
import { Hero } from "@/components/results/hero";
import { ExhibitA } from "@/components/results/exhibit-card";
import { Method } from "@/components/results/method";
import { Backtest } from "@/components/results/backtest";
import { Limitation } from "@/components/results/limitation";
import { Receipt } from "@/components/results/receipt";

export default function Home() {
  const d = loadDossier(); // pure, build-time; Turbopack watches the JSON so pipeline re-runs live-refresh
  return (
    <>
      <Hero hit={d.hit} medianLeadDays={d.metrics.medianLeadDays} />
      <ExhibitA hit={d.hit} />
      <Method metrics={d.metrics} scoreboard={d.scoreboard} />
      <Backtest cases={d.cases} floor={d.metrics.matchFloor} metrics={d.metrics} scoreboard={d.scoreboard} />
      <Limitation coverage={d.metrics.coverage} hit={d.hit} precision={d.metrics.precision} />
      <Receipt metrics={d.metrics} />
    </>
  );
}
```

```tsx
// components/results/backtest.tsx (server) — a section consuming domain types, never wire shapes
import { STATE_META } from "@/components/results/meta";

export function Backtest({ cases, floor }: { cases: CaseStudy[]; floor: number; /* … */ }) {
  return cases.map((c) => (
    // c.verdict is a discriminated union: `matched` guarantees similarity + leadDays + outcome exist
    <CaseCard key={c.id} caseStudy={c} floor={floor} />
  ));
}
```

Maintainer story (the test of the shape): the pipeline re-runs and emits a fifth trajectory. `d.cases` grows, the similarity ledger gains a bar, the case dossier gains a card, the funnel and receipt re-derive their counts, the coverage strip re-reads `metrics.coverage`. Zero layout edits. If some day `matched: true` disappears entirely, `d.hit` is `null` and the hero degrades to the slogan without the number, the ruler and Exhibit A sections render a quiet fallback, and the rest of the page still stands.

## Shape

**Data structures first.** One server-only module, `lib/dossier.ts`, is the single boundary where the three wire files become domain types (per boundary-discipline; transport shapes never reach the public surface). Its one export, `loadDossier(): Dossier`, hides: JSON parsing and cheap validation, the trajectory⋈comparison join, verdict classification into a discriminated union, case ordering (hit first), the shared time domain, and every derived count (matches = count of `matched` verdicts; districts = `coverage.total + controls.total` — derive, don't sync, per single-source-of-truth). The `Verdict` union encodes the load-bearing invariant in types: you cannot render a lead-days label for an unmatched case, because the field doesn't exist on that variant (per encode-lessons-in-structure).

**Flow.** `out/*.json` → `loadDossier()` → `Dossier` → seven server section components → CSS does all the motion. One client component exists in the whole page: `Reveal`, an IntersectionObserver wrapper that flips `data-inview` so below-the-fold figures start their CSS animations on entry (scroll-driven CSS timelines are Chromium-only; this is the one thing CSS can't do cross-browser). Hero animations are load-triggered and need no JS at all.

**Visual system.** Two semantic colors carry the entire thesis: green (`#2d8657` core, `#40bf7c` bright, `#d9f2e5` tint) marks the early signal; orange (`#f4900a`) is reserved exclusively for the RFP moment — it appears once in the hero ruler, once in Exhibit A's outcome chip, and nowhere else. A reader learns the code in the hero and reads every later figure for free. Typography goes fully to brand: Helvetica Neue/Arial stack for headings (no webfont), Geist body, Geist Mono for kickers, dates, evidence, and the receipt. Newsreader and Bricolage Grotesque are removed; the verbatim evidence renders in **mono**, because monospace makes "character-for-character" visible as a design property. Light `#fafafa` ground, white cards, hairline `#dcdcdb` rules, generous air — the dossier feels rigorous because everything on it is a citation.

**Animation invariant** (single rule, stated once, enforced everywhere): base CSS is the final frame; every keyframe travels *to* the base state with `both` fill; `prefers-reduced-motion: reduce` sets `animation: none` on the viz layer and the page is simply complete. No-JS gets the same complete page because `Reveal`'s pre-entry hidden state only applies under `@media (scripting: enabled)`.

**Interface depth judgment.** Public surface: one loader function, one `Dossier` type, one `STATE_META` registry, eight narrow presentational components. Hidden behind it: parsing, joining, classification, ordering, date math, derivation, and all animation choreography (which lives in `globals.css` keyframes, not component logic). Call chain to any pixel: `page.tsx` → section component → CSS. Two files of code, one of style (per minimize-reader-load).

**Deliberately not done:** no dark-mode redesign (brand extraction is light-only; flagged below), no client-side data fetching, no chart library, no scroll pinning or scroll-jacking, no JS count-up numbers (rejected as fragile; the ruler's accumulating ticks *are* the count), no fake multi-event timelines (all four current trajectories are single-event, `n_multi_event_clusters: 0`, and are shown as such), no config-driven section registry (one page, one consumer — premature abstraction).

## Synthesis decision

*(Filled in by arena after candidate comparison.)*

## Tradeoffs accepted

- We accept one client component (`Reveal`) in exchange for cross-browser scroll-triggered starts; pure CSS scroll-driven animation is Chromium-only today.
- We accept an n=1 hero claim ("317 days") in exchange for a 10-second thesis; the figure caption names the single case immediately and the limitation section is in the main flow, not a footnote.
- We accept anonymous cells in the scoreboard rows (only 3 of 8 districts are named in the artifacts) in exchange for strict number traceability — the copy point is the counts, not the names.
- We accept losing Newsreader's serif warmth and Bricolage's character in exchange for exact brand fidelity and two fewer webfonts.
- We accept that the funnel's 124-cell grid is schematic (cells are units of count, not document identities) in exchange for showing the true scale of attrition honestly; the caption says what the grid is.
- We accept showing charlotte-1's near-miss (0.41 vs the 0.50 floor, same RFP) in exchange for credibility — the matcher visibly says no, which is the strongest evidence the yes means something.

## Alternatives considered

- **Scrollytelling spine** — the whole page as one continuous vertical time axis (Dec 2020 → Apr 2022) with sections pinned to dates. Strong thesis-motion fit, but poor interface depth: every section must know the global date scale (information leakage), copy reflows whenever the span changes, and pinning needs heavy client JS or Chromium-only CSS. A fifth trajectory would force layout surgery. Rejected.
- **Dashboard evolution of the baseline** — bigger stat tiles, better charts, same structure. Cheapest path, but tiles are claims without evidence, the five-beat narrative order is lost, and motion becomes decoration. It hides nothing and explains nothing. Rejected.
- **Per-viz client islands with rAF/spring animation** — smoothest possible motion, but violates the CSS-first constraint, multiplies hydration for a static story, and scatters animation state across N islands that each expose timing knobs to callers. Rejected.
- **Config-driven `<StoryPage sections={...}>` renderer** — sections as a data array with renderer lookup. Superficially "registry-like," but it adds an indirection layer with exactly one consumer and makes every section's props go through a lowest-common-denominator interface. The data (`Dossier`) is what deserves centralizing, not the JSX. Rejected per laziness-protocol.

## Open questions and risks

- Vendor names and dollar amounts ($179,820 Sinnott Wolach; $78,499 UDT/Lightspeed; $227,000 Securly) are public record, but are we comfortable rendering them prominently on a page that may be shown outward?
- Should charlotte-1's would-have-been lead (254 days, below floor, same RFP) be shown in its case card, or is the risk of it being misread as a second hit worse than the honesty it buys?
- Confirm the color reservation: orange strictly and only for RFP moments (the current orange-leaning `--chart-*` tokens get retired)?
- Dark mode: the brand extraction is light-only. Delete the `.dark` token block (my recommendation — an unowned surface goes stale) or retheme it to a dark green ramp?
- Is `metadata.description` interpolating `median_lead_days` acceptable (it keeps the 317 fresh in link previews, but previews change when the pipeline re-runs)?
- Minor: `IsoDate` is a branded string validated at the boundary; agreed that inside the app we trust it (no re-validation)?

## Next implementation step

Write `lib/dossier.ts` — the branded types, `Verdict` union, `Dossier`, and a `loadDossier()` skeleton with `not implemented` derivations — then retheme the `@theme`/`:root` block in `globals.css` to the NationGraph tokens, so every subsequent component lands on final types and final colors.

---

# Appendix A — page spec, in reading order, with actual copy

Copy shown with current rendered values; every number is interpolated from the dossier at build time (interpolation ledger in Appendix E). Voice: short, plain, confident. No sentence over ~20 words.

### S0 · Top bar

Slim, hairline bottom border (`#dcdcdb`). Left: **NationGraph** (Helvetica, semibold, ink `#191818`). Right, mono caption, muted:

> Research prototype · Florida school districts

### S1 · Hero — the claim (10-second thesis, fully in first viewport)

- Kicker (mono, uppercase, tracked, muted): `PROCUREMENT SIGNALS · BACKTESTED`
- H1 (Helvetica, 56–72px, ink): **Know 317 days before the RFP drops.**
- Lede (Geist, 2 sentences, muted, max-w-2xl):

> Vendors hear about a government purchase when the solicitation publishes — after requirements are written and the incumbent has the inside track. The intent is public long before that, sitting in ordinary school-board paper.

- Figure: **V1 Lead ruler** (below). Caption (mono, small, muted):

> Charlotte County Public Schools — board packet, Mar 9, 2021 → E-rate firewall RFP, Jan 20, 2022.

- Fallback (`hit === null`): H1 becomes **Know before the RFP drops.**, ruler omitted, caption replaced by `No matched case in the current run.` The rest of the page still renders.

### S2 · Exhibit A — the signal itself

- Kicker: `EXHIBIT A`
- H2: **It was sitting in the agenda packet.**
- Body (1 sentence): `Months before the RFP, the board had already approved the request — vendor and dollar amount attached.`
- Figure: **V2 Highlighted evidence facsimile** (below). Document-styled white card, mono header line built from event fields:

> 2021-03-09 · Regular board meeting · board agenda packet

  then the verbatim evidence, mono, with an animated highlighter sweep:

> 20/21-40GH Sinnott Wolach Technology Firewall Software, eRate LTT 37939708007400691 $179,820

  Annotations (thin leader lines to labels): `Vendor — Sinnott Wolach Technology` · `Amount — $179,820` · `Board action — RFP request approved`.
  Outcome chip beneath, the page's second and last orange mark, linking the outcome URL:

> ● The RFP followed on Jan 20, 2022 — "Firewall Services, per FCC USAC's E-rate Program"

- Gate caption (mono, small): `Extraction rule: every event must quote its source character-for-character, or it is dropped.`

### S3 · Method — how it works

- Kicker: `METHOD`
- H2: **Read everything. Keep what's provable.**
- Four numbered steps (title + one line each):
  1. **Collect** — `124 public documents from 8 Florida districts: agendas, minutes, budgets, procurement archives.`
  2. **Extract** — `A model pulls purchase events. No verbatim quote in the source — no event. District, date, and URL come from the source ledger, never from the model.`
  3. **Link** — `Events about the same initiative are connected across meetings into trajectories.`
  4. **Backtest** — `Trajectories are matched against the real 2022 solicitations. Every source document predates its outcome.`
- Figure: **V3 Extraction funnel** (below), stage line reads `124 documents → 4 verified events → 4 trajectories → 1 match`.
- Caption: `The gate is strict on purpose. What survives is small — and checkable.`

### S4 · Backtest — the result

- Kicker: `RESULT`
- H2: **One clean hit. Zero false alarms.**
- Stat band, three big Helvetica numerals with mono sublabels, staggered entrance:
  - **317** `days early`
  - **1/1** `hand-labeled precision`
  - **0/3** `control districts fired`
- Figure: **V4 Control panel** (below). Caption: `Three districts that never bought cybersecurity. The pipeline stayed silent in all three.`
- Figure: **V5 Similarity ledger** (below). Caption: `Match floor 0.50 — one trajectory cleared it. A second Charlotte signal scored 0.41 against the same RFP and stayed below the floor.`
- **Case dossier**: four case cards (existing Accordion for event rows). Card header: district · initiative · category badge · verdict chip. Verdict copy by union variant:
  - charlotte-0 — `Matched · similarity 0.60 · 317 days before the RFP` (links outcome URL)
  - charlotte-1 — `Below match floor · similarity 0.41 · the RFP came 254 days later, but the score stayed under 0.50`
  - citrus-0 — `Control district. No outcome to match — and none claimed.`
  - miami-dade-0 — `Below match floor · similarity 0.34 against a later cybersecurity RFP`
  Expanded event row: date, state badge (from `STATE_META`), action, summary, evidence quote (mono, green left rule), amount, source line (web links open; local paths shown as `Local board_agenda_packet` like the baseline).

### S5 · The limitation — honest by design

- Kicker: `THE HONEST PART`
- H2: **It found 1 of 5.**
- Body:

> Five districts in this sample made a known cybersecurity purchase. The pipeline surfaced one — the one whose paper trail entered the corpus. The other four trails never made it in; a thin sample of meeting paper misses most of what boards do. The fix is more documents per district, not a smarter model.

- Figure: **V6 Coverage strip** (below). Caption: `Coverage 1 of 5 (20%). Recall is a data problem; precision held at 1/1.`

### S6 · Receipt — footer

Mono receipt block on a hairline top border, all interpolated:

> 124 documents · 4 events · 4 trajectories · 1 match
> coverage 1/5 (20%) · median lead 317 days · control false alarms 0/3 · precision 1/1
> link threshold 0.78 · match floor 0.50
> © 2026 NationGraph

---

# Appendix B — visualization specs

Common rules: SVG/CSS only; base style = final frame; all animations `both`-filled; `prefers-reduced-motion: reduce` ⇒ `animation: none`, page complete; each figure carries an `sr-only` one-sentence summary and `role="img"` + `aria-label`.

### V1 · Lead ruler (hero, load-triggered, no JS)

- **Shows:** the 317-day gap between the board signal and the RFP, as a ruler that draws itself.
- **Data:** `timelines["charlotte-county-public-schools-0"].events[0].date` (start), `comparison[...].outcome_date` (end), `comparison[...].lead_days` (label), month tick positions derived from the two dates via a server-side `timeScale`.
- **Form:** full-width SVG. Left endpoint: green dot + small mono chip `Board packet · Mar 9, 2021`. Right endpoint: orange ring + chip `RFP · Jan 20, 2022`. Between: a horizontal rule with ~10 month ticks. Above the right end, a large Helvetica numeral `317 days`.
- **Animation:** line `pathLength="100"; stroke-dasharray: 100` with `@keyframes ruler-draw { from { stroke-dashoffset: 100 } to { stroke-dashoffset: 0 } }`, `1.4s cubic-bezier(.22,1,.36,1) .3s both`. Month ticks: `@keyframes tick-in` (opacity 0→1, translateY 4px→0), `animation-delay: calc(300ms + var(--i) * 110ms)` — the ticks accumulating *are* the count-up. Orange ring scales in (`transform-box: fill-box; transform-origin: center`) at ~1.7s; `317 days` stamps in (`@keyframes stamp-in`: scale .94→1 + fade) at ~1.9s.
- **5-second takeaway:** a real district's purchase was publicly visible almost a year before its RFP.

### V2 · Highlighted evidence facsimile (Exhibit A, Reveal-triggered)

- **Shows:** the signal is one verifiable line in a real public document.
- **Data:** hit event's `evidence`, `date`, `source_type`, `vendor`, `amount`, `state`/`action`; outcome chip from `comparison` (`outcome_title`, `outcome_date`, `outcome_url`).
- **Form:** white card, thin border, mono document header, evidence string in Geist Mono at reading size; three annotation labels connected by 1px leader lines; orange-dotted outcome chip below.
- **Animation:** highlighter — `background-image: linear-gradient(#d9f2e5, #d9f2e5); background-repeat: no-repeat; background-size: 0% 100%;` with `@keyframes hl-sweep { to { background-size: 100% 100% } }`, `900ms ease-out`, starting when the ancestor gets `data-inview`. Leader lines draw via `stroke-dashoffset` (400ms each, staggered 150ms after the sweep); labels fade in behind their lines. Outcome chip fades last.
- **5-second takeaway:** this is not an inference — here is the exact sentence, and here is what it led to.

### V3 · Extraction funnel (method, Reveal-triggered)

- **Shows:** brutal, honest attrition: 124 in, 4 out, 1 proven.
- **Data:** `metrics.n_docs`, `metrics.n_events`, `metrics.n_clusters`, derived match count (matched verdicts in `comparison`).
- **Form:** a CSS grid of 124 small squares (each with inline `--i`), followed by a mono stage line `124 documents → 4 verified events → 4 trajectories → 1 match` whose segments reveal left to right. Cells are schematic units of count, not document identities; the caption says so implicitly ("what survives is small").
- **Animation:** non-survivor cells run `@keyframes cell-dim { to { opacity: .15 } }` with `animation-delay: calc(var(--i) * 6ms)` — a ~750ms wave of documents being discarded. Four survivor cells run `@keyframes cell-keep { to { background: #40bf7c; scale: 1.15 } }` at the wave's end. Stage-line segments use `tw-animate-css` (`animate-in fade-in slide-in-from-left-2`) with 150ms incremental delays.
- **5-second takeaway:** almost everything is thrown away; what remains is verified.

### V4 · Control panel (result, Reveal-triggered)

- **Shows:** the pipeline was pointed at 3 districts that never bought — and stayed silent.
- **Data:** `metrics.control_fp.control_districts` (tile count), `metrics.control_fp.firing_districts` (0), `rate` (0.0).
- **Form:** three flat tiles labeled `Control 1..3` (names not in artifacts — by design), each with a status line.
- **Animation:** a gradient sheen sweeps each tile (`::after` translateX −120%→120%, 700ms, delays 0/350/700ms) — "we checked" — then each settles with a small mono `Quiet · 0 alarms` fading in.
- **5-second takeaway:** it doesn't cry wolf; where there was nothing to find, it found nothing.

### V5 · Similarity ledger (result, Reveal-triggered)

- **Shows:** matching is a scored decision with a floor, not vibes.
- **Data:** per case `comparison[id].similarity` (0.5959, 0.4075, null, 0.3392 — displayed to 2dp, derived at render), `metrics.match_threshold` (0.50 floor).
- **Form:** four labeled horizontal bars on a 0→1 axis; a dashed vertical rule at 0.50 labeled `match floor 0.50`. Hit bar in core green `#2d8657` crossing the rule; others in `#dcdcdb` with muted labels; citrus renders an em-dash row `— no outcome to score` instead of a bar.
- **Animation:** fills are width-set statically to `calc(similarity * 100%)` and animate in with `@keyframes bar-grow { from { transform: scaleX(0) } }`, `transform-origin: left`, `700ms cubic-bezier(.22,1,.36,1)`, staggered 120ms. Floor rule fades in first.
- **5-second takeaway:** one bar crosses the line; the near-miss visibly doesn't. The yes means something because the no is visible.

### V6 · Coverage strip (limitation, Reveal-triggered)

- **Shows:** the honest miss rate — 1 of 5 known purchases surfaced.
- **Data:** `metrics.coverage.covered`, `metrics.coverage.total`, `metrics.coverage.rate`; the filled cell labeled with the hit's district and `comparison.lead_days`.
- **Form:** five equal cells in a row. Cell 1: green fill, label `Charlotte · found 317 days early`. Cells 2–5: hatched (`repeating-linear-gradient` 45°, `#ededed`/transparent), label `not in sample`.
- **Animation:** cell 1 fills bottom-up (`@keyframes fill-up { from { transform: scaleY(0) } }`, `transform-origin: bottom`, 600ms); hatch cells fade in staggered 100ms; labels stamp in after.
- **5-second takeaway:** it caught one of five — the one with paper — and the page says so out loud.

---

# Appendix C — typed domain model

```ts
// lib/dossier.ts — server-only by convention (only ever imported from server components).
// The single boundary where out/*.json wire shapes become domain types.
// Nothing outside this file imports from "@/out/*". Validate here, trust types inside.

import metricsRaw from "@/out/metrics.json";
import timelinesRaw from "@/out/timelines.json";
import comparisonRaw from "@/out/comparison.json";

/** Branded ISO date, validated once at the boundary. */
export type IsoDate = string & { readonly __brand: "IsoDate" };

export type EventState =
  | "DISCUSSION" | "WORKSHOP" | "BUDGET" | "AUTHORIZATION"
  | "SOLICITATION" | "AWARD" | "RENEWAL" | "OTHER";

export interface SignalEvent {
  date: IsoDate;
  state: EventState;                 // unknown wire states collapse to "OTHER" at parse
  action: string;
  vendor: string | null;
  amount: number | null;             // dollars
  summary: string;
  evidence: string;                  // verbatim quote; rendered character-for-character in mono
  source: { url: string; isWeb: boolean; type: string };
}

export interface Outcome {
  title: string;
  type: string;                      // e.g. "RFP"
  date: IsoDate;
  url: string | null;
}

/**
 * Backtest verdict as a discriminated union. Invariant encoded in types:
 * a lead-days label can only be rendered for a variant that carries it.
 */
export type Verdict =
  | { kind: "matched";    similarity: number; leadDays: number; outcome: Outcome }
  | { kind: "belowFloor"; similarity: number; leadDaysIfMatched: number | null; outcome: Outcome }
  | { kind: "noOutcome" };

export interface CaseStudy {
  id: string;                        // cluster id, e.g. "charlotte-county-public-schools-0"
  district: string;
  initiative: string;
  category: string;
  firstDate: IsoDate;
  lastDate: IsoDate;
  events: SignalEvent[];             // ≥1, chronological
  verdict: Verdict;
}

export interface DossierMetrics {
  docs: number;                      // metrics.n_docs
  events: number;                    // metrics.n_events
  clusters: number;                  // metrics.n_clusters
  matches: number;                   // DERIVED: count of "matched" verdicts (never stored)
  medianLeadDays: number | null;     // metrics.median_lead_days
  coverage: { covered: number; total: number; rate: number };
  controls: { total: number; fired: number; rate: number };
  precision: { correct: number; labeled: number; rate: number };
  linkThreshold: number;             // metrics.threshold
  matchFloor: number;                // metrics.match_threshold
}

export interface Scoreboard {
  purchasers: { total: number; covered: number };  // = coverage; drives V6
  controls:   { total: number; fired: number };    // = control_fp; drives V4
}

export interface DateSpan { min: IsoDate; max: IsoDate }

export interface Dossier {
  metrics: DossierMetrics;
  cases: CaseStudy[];                // hit first, then district A→Z, then firstDate
  hit: CaseStudy | null;             // the matched case, if any (current data: exactly one)
  scoreboard: Scoreboard;            // derived from metrics, single source of truth
  span: DateSpan;                    // shared time domain across all events + outcomes
}

/** Parse, join, classify, derive. Pure; safe to call from any server component (module-cached). */
export function loadDossier(): Dossier {
  // TODO: parseIsoDate(s): IsoDate — throws at build time on malformed wire dates
  // TODO: parse events (state fallback "OTHER", isWeb = /^https?:\/\//)
  // TODO: join timelines ⋈ comparison by cluster id → classify Verdict
  // TODO: order cases (hit first), derive matches/scoreboard/span
  throw new Error("not implemented");
}

/** 0..100 position on the shared time axis; used by the lead ruler's server-side layout. */
export function timeScale(span: DateSpan): (d: IsoDate) => number {
  throw new Error("not implemented");
}

// Formatters (module-local Intl instances, UTC like the baseline)
export function formatDate(d: IsoDate): string { throw new Error("not implemented"); }   // "Mar 9, 2021"
export function formatMoney(n: number): string { throw new Error("not implemented"); }   // "$179,820"
export function formatSimilarity(n: number): string { throw new Error("not implemented"); } // "0.60" (2dp at render)
```

```ts
// components/results/meta.ts — presentation registry (server module, no "use client").
// Tailwind v4 scans literals, so every class string is complete. Green-scale ramp only;
// the multi-hue baseline palette is retired so orange stays reserved for RFP moments.

export const STATE_META: Record<EventState, { label: string; dot: string; badge: string }> = {
  DISCUSSION:    { label: "Discussion",    dot: "bg-ng-green-200",  badge: "bg-ng-tint-2 text-ng-green-800" },
  WORKSHOP:      { label: "Workshop",      dot: "bg-ng-green-200",  badge: "bg-ng-tint-1 text-ng-green-700" },
  BUDGET:        { label: "Budget",        dot: "bg-ng-green-300",  badge: "bg-ng-tint-2 text-ng-green-800" },
  AUTHORIZATION: { label: "Authorization", dot: "bg-ng-green-400",  badge: "bg-ng-tint-3 text-ng-green-800" },
  SOLICITATION:  { label: "Solicitation",  dot: "bg-ng-green-600",  badge: "bg-ng-tint-3 text-ng-green-900" },
  AWARD:         { label: "Award",         dot: "bg-ng-green-800",  badge: "bg-ng-tint-4 text-ng-green-900" },
  RENEWAL:       { label: "Renewal",       dot: "bg-ng-green-500",  badge: "bg-ng-tint-2 text-ng-green-800" },
  OTHER:         { label: "Other",         dot: "bg-neutral-400",   badge: "bg-neutral-100 text-neutral-600" },
};

/** Verdict chip copy + tone, keyed by Verdict["kind"] — sections read this, never branch on raw fields. */
export const VERDICT_META: Record<Verdict["kind"], { tone: "hit" | "muted"; chipClass: string }> = /* … */;
```

---

# Appendix D — module map

| File | Change | Runs | Why |
|---|---|---|---|
| `app/layout.tsx` | edit | server | Fonts to brand: `Geist` + `Geist_Mono` via `next/font/google`; drop Bricolage/Instrument/Newsreader; `--font-display` becomes the Helvetica Neue/Arial stack set in CSS (no webfont). Metadata: title `NationGraph — Know before the RFP drops`, description interpolates `median_lead_days`. |
| `app/globals.css` | edit | — | `@theme`/`:root` retheme to NationGraph tokens (`--background: #fafafa`, `--card: #fdfdfd`, `--border: #dcdcdb`, `--primary: #2d8657`, `--foreground: #1f201e`, `--muted-foreground: #6a6b67`, namespaced `--color-ng-green-*` ramp + tints, `--color-ng-orange: #f4900a`); full keyframes inventory (Appendix E); reveal + reduced-motion infrastructure. Retire orange-leaning `--chart-*`. |
| `lib/dossier.ts` | new | server | The boundary module: types, `loadDossier`, `timeScale`, formatters. The only importer of `out/*.json`. |
| `app/page.tsx` | rewrite | server | Thin composition: `loadDossier()` + six sections + Empty-state fallback (reuses existing `Empty` component when `cases.length === 0`). |
| `components/results/hero.tsx` | new | server | S1: headline, lede, embeds `LeadRuler`. Handles `hit === null` fallback. |
| `components/results/lead-ruler.tsx` | new | server | V1. SVG laid out server-side via `timeScale`; animation is pure CSS on load. |
| `components/results/exhibit-card.tsx` | new | server | S2/V2 facsimile card + annotations + outcome chip. |
| `components/results/method.tsx` | new | server | S3 steps + V3 funnel grid (124 cells with inline `--i`). |
| `components/results/backtest.tsx` | new | server | S4: stat band, V4 control panel, V5 similarity ledger, case dossier (reuses existing `Accordion`, `Badge`, `Separator`). |
| `components/results/limitation.tsx` | new | server | S5 + V6 coverage strip. |
| `components/results/receipt.tsx` | new | server | S6 mono receipt footer. |
| `components/results/meta.ts` | new | server | `STATE_META` + `VERDICT_META` registries (complete literal Tailwind classes). |
| `components/results/reveal.tsx` | new | **client** | The only island. IntersectionObserver (`once: true`, `threshold: .25`) flips `data-inview="false" → "true"`. Justification: cross-browser scroll-triggered animation start; CSS scroll-driven timelines are Chromium-only. All motion stays in CSS. |

Not touched: `components/ui/*` (reused as-is), the Python pipeline, `out/*` artifacts.

---

# Appendix E — animation infrastructure and traceability

**Keyframes inventory (`globals.css`):** `ruler-draw` (stroke-dashoffset 100→0) · `tick-in` (opacity+4px rise) · `stamp-in` (scale .94→1 + fade) · `hl-sweep` (background-size 0%→100%) · `cell-dim` (opacity→.15) · `cell-keep` (bg→`#40bf7c`, scale 1.15) · `scan` (::after sheen translateX) · `bar-grow` (scaleX 0→1, origin left) · `fill-up` (scaleY 0→1, origin bottom). Text entrances reuse `tw-animate-css` (`animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards` + delays), as the baseline already does.

**Reveal mechanism:** `Reveal` SSRs `data-inview="false"`. Pre-entry hiding lives only under `@media (scripting: enabled) { [data-inview="false"] .rv { opacity: 0 } }` — so no-JS browsers show the complete static page. On intersection the attribute flips and descendant animations run once, `both`-filled.

**Reduced motion:** `@media (prefers-reduced-motion: reduce) { .viz *, .rv { animation: none !important; transition: none !important } }` plus the scripting-gated hide rule is disabled. Because base CSS is the final frame everywhere, the reduced page is byte-identical in content.

**Number traceability ledger** (every figure in the copy → artifact path):

| Copy | Source |
|---|---|
| 317 (headline, stat band, ruler, coverage label, receipt) | `metrics.median_lead_days`; equals `comparison["charlotte-county-public-schools-0"].lead_days` |
| 124 / 4 events / 4 trajectories | `metrics.n_docs` / `n_events` / `n_clusters` |
| 1 match | derived: count of `matched: true` in `comparison` |
| 1/5 · 20% | `metrics.coverage.covered/total/rate` |
| 0/3 controls | `metrics.control_fp.firing_districts/control_districts` |
| 1/1 precision | `metrics.precision.correct/labeled` |
| 0.50 floor / 0.78 link | `metrics.match_threshold` / `metrics.threshold` |
| 0.60 / 0.41 / 0.34 (2dp at render) | `comparison[*].similarity` (0.5959 / 0.4075 / 0.3392) |
| 254 days (charlotte-1 card) | `comparison["charlotte-county-public-schools-1"].lead_days` |
| $179,820 / $78,499 / $227,000 | `timelines[*].events[0].amount` |
| Mar 9 2021 · Jan 20 2022 · May 11 2021 · Dec 8 2020 · Jun 23 2021 | `timelines[*].events[0].date`, `comparison[*].outcome_date` |
| 8 districts | derived: `coverage.total + control_fp.control_districts` |
| Month ticks on ruler | derived from the two hit dates via `timeScale` |

No number on the page is hardcoded; a pipeline re-run reflows every figure, caption, and the receipt.
