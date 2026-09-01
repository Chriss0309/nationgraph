# Candidate C — The page is a proof, not a dashboard

The results page is a single typed `Brief`. The visitor meets one sentence, one gap, one quote. Everything else is how that proof was earned, and why it is rare.

## Problem

NationGraph’s results page must make one claim unmistakable: vendors learn of a school-district cybersecurity purchase when the RFP drops, which is too late; buying intent is already sitting in ordinary board documents; this prototype recovered a real purchase 317 days early, with zero control false alarms, and missed four of five known buys because the sample is thin. The current `app/page.tsx` is a server-rendered evaluation receipt: a slogan, four stat tiles, a static rainbow-dot strip of four trajectories, and an accordion of events. It never states the vendor problem, never shows the method, never names the 1/5 miss, and treats the Charlotte hit as case 01 of 04. Wire JSON is joined in the page. State colors (sky, violet, amber, teal) fight the NationGraph green scale. Fonts (Bricolage Grotesque, Instrument Sans, Newsreader) are not the live site. Four events do not need an accordion; collapsing them fakes a corpus. The non-obvious shape question is how to bind a tiny, strict dataset (`out/metrics.json`, `out/timelines.json`, `out/comparison.json`) into a marketing-grade argument without inventing scale, without a chart library, and without client JavaScript unless CSS cannot speak.

Constraints honored: Next.js 16 App Router, server components default, JSON module imports as the only data path, Tailwind v4 literal classes, `tw-animate-css` already installed, no new npm dependencies, `prefers-reduced-motion`, brand tokens over experimental type, story order problem → thesis → method → result → limitation, every displayed number traceable to the three JSON files.

## Usage (caller's view)

The caller is `app/page.tsx`. It does not import JSON. It does not classify hits. It does not compute coordinates. It asks for a `Brief` and renders.

```tsx
// app/page.tsx — the only page call site
import { loadBrief } from "@/lib/brief";
import { BriefView, EmptyBrief } from "@/components/brief-view";

export function generateMetadata() {
  const brief = loadBrief();
  if (!brief.featured) {
    return {
      title: "NationGraph — Know before the RFP drops",
      description:
        "A research prototype that looks for school-district cybersecurity purchases in public board documents.",
    };
  }
  return {
    title: `The RFP is ${brief.featured.leadDays} days late — NationGraph`,
    description: `Charlotte County Public Schools voted in public ${brief.featured.leadDays} days before the E-rate firewall RFP. Coverage ${brief.backtest.coverage.covered}/${brief.backtest.coverage.total}. Control false positives ${brief.backtest.controls.firing}/${brief.backtest.controls.total}.`,
  };
}

export default function Home() {
  const brief = loadBrief();
  if (brief.sample.events === 0) return <EmptyBrief sample={brief.sample} />;
  return <BriefView brief={brief} />;
}
```

A visualization reads geometry the parser already made. It cannot be handed an unmatched lead.

```tsx
// inside BriefView — featured corridor (hero)
{brief.featured ? (
  <LeadCorridor model={brief.corridor} />
) : (
  <p>A median lead has not been established.</p>
)}
```

A pipeline re-run is the third call site. No React file changes.

```
# uv run trajectory.py all
# writes out/metrics.json, out/timelines.json, out/comparison.json
# Turbopack reloads; loadBrief() re-joins; the hit cell, corridor, and receipt update
# a fifth trajectory becomes another Unmatched or Hit from the join, not a new section component
```

If the JSON disagrees with itself (event count ≠ `n_events`, two records marked matched but `coverage.covered === 1`), `loadBrief()` throws. The page never renders a stale slogan over broken math.

## Shape

**The page is a proof object.** `loadBrief()` is the public surface: one function, one domain value. It reads the three JSON modules, validates at the boundary, joins trajectory to comparison by cluster id, and classifies each cluster as `Hit` or `Unmatched`. Unmatched records may carry a below-threshold similarity and even a `lead_days` field in the wire file; those numbers are not `Hit.leadDays` and cannot feed the headline, the corridor, or the receipt’s lead figure. That is the load-bearing invariant (`encode-lessons-in-structure`, `boundary-discipline`).

Data structures first. Dominant access patterns:

1. Hero needs one featured hit (longest `leadDays` among matches; today the only match), its board date, outcome date, quote, district, initiative, outcome title.
2. Method viz needs four integers: `n_docs`, `n_events`, `n_clusters`, `coverage.covered`.
3. Jury viz needs `coverage.total` cells and `control_fp.control_districts` cells, plus labels only for districts that appear in `timelines.json`.
4. Evidence list maps `hits` then `unmatched` — variable length, layout-stable.
5. Receipt prints the backtest block and thresholds.

All five are fields on `Brief`. No later index, no client cache, no “we’ll look up comparison in the component.”

**Interface depth.** The public surface is `loadBrief(): Brief` plus a handful of presentational components that accept already-shaped view models (`CorridorModel`, `AttritionModel`, `JuryModel`). Hidden behind that: ISO date parsing, UTC formatting, hit/unmatched discrimination, the rule that control extracts without an outcome are not false alarms, SVG/CSS geometry, the 5+3 cell roster derived as `coverage.total` and `control_fp.control_districts`, and the refusal to name districts that are not in the JSON. Callers never see wire types. The interface is no larger: there is one page, one dataset, one question.

**What the system does not do.** No chart library. No count-up. No accordion. No rainbow state palette. No client component for motion. No dark theme (the live site is light). No hardcoded 317, 124, 1/5, or 0/3 in source — copy below shows current values as the bound output of `Brief`. No district names pulled from `data/raw/` folder names. No README numbers (882 days, 1/2, Hillsborough/Pinellas). Unmatched `lead_days` (254, 296) are not displayed as results.

**Motion policy.** CSS keyframes, `tw-animate-css` entrance utilities with literal delay classes (`delay-100`, `delay-200`, `delay-300`), `nth-child` stagger, and `animation-timeline: view()` inside `@supports`. Fallback: the same keyframes run once on load. `@media (prefers-reduced-motion: reduce)` snaps every animation to its end frame. Zero `"use client"` in app or new components. Existing `Separator` is a client island — do not import it; use `border-t` / `border-l`. Drop `Accordion`. Keep `Badge` and `Empty` (server-safe). Native `<a>` for the one live outcome URL.

**Brand.** Headings: `"Helvetica Neue", Arial, sans-serif` via `--font-heading` (no webfont). Body: `Geist` from `next/font/google`. Mono: `Geist Mono` (already loaded). Drop Bricolage Grotesque, Instrument Sans, Newsreader. Quotes are Geist italic with a 2px `#2d8657` left rule — the quote is a found document, distinguished by treatment, not a third family. Color: background `#fafafa`, cards `#fdfdfd`, ink `#191818`, muted `#6a6b67` / `#5a5b57`, border `#dcdcdb`, primary `#2d8657`, bright `#40bf7c`, deepest green `#0d2619`. Orange `#f4900a` once: the RFP pole. No secondary blue. Radius 4px. No drop shadows. Generous whitespace. Measure: prose `max-w-xl` (~36rem); visualizations break out to `max-w-5xl`. Event states are labels, not a legend of colors — all board-event dots use `#2d8657`; the outcome ring is orange.

**Story architecture.** Five beats in required order, but the hero viewport already contains problem + thesis + the 317-day proof (rubric: 10-second thesis before scroll). Method, full backtest (controls, precision, the four extracts), and limitation follow. The page is a typeset research letter, not a SaaS dashboard: one full-bleed instrument, then a narrow argument.

## Page spec (reading order)

All figures below are the current JSON bindings, not literals to paste into source. Binding noted in parentheses.

### Masthead

Full width, `px-5 sm:px-8`, `pt-8`, hairline bottom `#dcdcdb`.

- Wordmark, Helvetica Neue, 14px, `#191818`: `NationGraph`
- Trailing mono 11px `#6a6b67`: `Research prototype`

No product subtitle. No “procurement trajectory engine.”

### 1. Hero — problem, thesis, proof (first viewport)

Section: `min-h-[100svh]` on desktop is wrong (too much chrome). Target: the following block fits a 900px-tall laptop viewport without scroll. `pt-16 sm:pt-24 pb-16`.

Kicker, Geist Mono, 11px, uppercase, tracking `0.2em`, `#6a6b67`:

`Public record · cybersecurity procurement`

H1, Helvetica Neue, 48px / 64px sm, weight 600, tracking tight, `#191818`, bound to `brief.featured.leadDays` (metrics `median_lead_days` / charlotte-0 `lead_days` = **317**):

`The RFP is 317 days late.`

Fallback if `featured === null`: `The RFP is the last signal.`

Lead, Geist 18px, `#5a5b57`, `max-w-xl`, two sentences:

`Vendors learn about a purchase when the solicitation is published. By then the requirements are written.`

Thesis line, same block, `#191818`:

`Buying intent is already in the board packet. This prototype found it.`

**Visualization 1 — Lead corridor** (spec below). Sits immediately under the thesis line, full `max-w-5xl`.

Caption, mono 11px, `#6a6b67`, under the corridor:

`Charlotte County Public Schools · Firewall Software · board vote 9 Mar 2021 · E-rate RFP 20 Jan 2022`

(district, initiative, `first_date`, comparison `outcome_date` of the featured hit)

**Visualization 2 — Quote sweep** (spec below), directly under the caption. The quote *is* the thesis evidence, not a later appendix.

If `featured === null`, omit corridor and quote; keep the two-sentence problem copy.

### 2. Method

Section: `pt-8 pb-20`, kicker + title in the narrow measure, viz at `max-w-5xl`.

Kicker: `Method`

H2: `124 documents. One factuality gate.`

(`n_docs` = **124**)

Body, three short paragraphs, Geist 16px, `#5a5b57`:

`We read board agendas, minutes, budgets, and procurement files from 8 districts. Five made a known cybersecurity purchase in 2022. Three never did.`

(8 = `coverage.total` + `control_fp.control_districts` = 5 + 3; 5 and 3 from metrics)

`An event is kept only when a verbatim quote appears character-for-character in the source. District, date, and URL are stamped from the ledger, not the model.`

`Events about the same initiative are linked into trajectories, then scored against the real 2022 solicitations. Every source document pre-dates its outcome.`

**Visualization 3 — Attrition field** (spec below).

Strip of four bound numbers under the field, hairline top, four columns, no client Separator:

| `124` | `4` | `4` | `1` |
| documents | events | trajectories | matched |

(`n_docs`, `n_events`, `n_clusters`, `coverage.covered`)

### 3. Result

Kicker: `Backtest`

H2: `One hit. Zero false alarms.`

Three figures, same hairline grid:

- `317 days` — label `Median lead` (`median_lead_days`)
- `0 / 3` — label `Control false positives` (`control_fp.firing_districts` / `control_fp.control_districts`)
- `1 / 1` — label `Hand-labeled precision` (`precision.correct` / `precision.labeled`)

**Visualization 4 — Cohort jury** (spec below).

Then the evidence list. Not an accordion. Four events total; all quotes visible. `hits` first, then `unmatched`.

**Card 01 — hit** (charlotte-0). Left 2px green rule. Badge `Hit`.

- Title: `Firewall Software`
- Meta: `Charlotte County Public Schools · 9 Mar 2021 · Solicitation`
- Amount line: `Sinnott Wolach Technology · $179,820` (`vendor`, `amount`)
- Quote in italic with green rule (same treatment as hero; no second sweep)
- Match line in `#2d8657`: `Matched · Firewall Services, per FCC USAC's E-rate Program · 20 Jan 2022 · 317 days · similarity 0.60`

(`outcome_title`, `outcome_date`, `lead_days`, `similarity` 0.5959 → `toFixed(2)`; `outcome_url` is `https://…` so it is a real link: `Open the RFP`)

Source line, mono: `Local board_agenda_packet` (url is not `http(s)`, so no fake outbound link)

**Card 02** (charlotte-1). Badge `Below threshold`.

- Title: `URL/Web Content Filtering and Monitoring`
- Meta: `Charlotte County Public Schools · 11 May 2021 · Solicitation`
- Amount: `United Data Technologies partnered with Lightspeed Systems · $78,499`
- Quote visible
- Note, `#6a6b67`: `Similarity 0.41. Match floor 0.50. Not a hit.`

Do **not** print `lead_days` 254. That number is a distance to an unmatched outcome and would impersonate a second success.

**Card 03** (citrus-0). Badge `No outcome in ledger`.

- Title: `Securly Web Filtering and Monitoring`
- Meta: `Citrus County School District · 8 Dec 2020 · Authorization`
- Amount: `Securly · $227,000`
- Quote visible
- Note: `No 2022 solicitation in the ledger. Not counted as a control false alarm.`

(`similarity` is `null`; `control_fp.firing_districts` remains 0. The page must not say “controls were silent” as if no extract existed.)

**Card 04** (miami-dade-0). Badge `Below threshold`.

- Title: `Cyber Liability Insurance Renewal`
- Meta: `Miami-Dade County Public Schools · 23 Jun 2021 · Renewal`
- Quote visible
- Note: `Similarity 0.34. Compared to ESSER NIST Cybersecurity Services. Not a hit.`

Do **not** print `lead_days` 296.

Empty branch (existing `Empty`): if `n_events === 0`, title `No verified trajectories`, body uses `n_docs` as today: either empty ledger or “N source documents were processed, but no linked trajectory met the evidence criteria.” Keep the `data/sources.csv` / `uv run trajectory.py all` hint.

### 4. Limitation

Kicker: `Limit`

H2: `1 of 5. The miss is the sample.`

(`coverage.covered` / `coverage.total` = **1 / 5**, rate 0.2)

Body:

`The prototype covered 1 of 5 known purchases. Four buying trails never appeared in the 124 documents we read. The fix is more documents per district, not a smarter model.`

**Visualization 5 — Silent cells** (spec below).

No density-per-month figure. That rate is not in the three JSON files. Do not compute one.

### Footer receipt

Hairline top. Geist Mono 11px, `#6a6b67`. One line, wrapping:

`124 docs · 4 events · 4 trajectories · coverage 1/5 · lead 317d · control FP 0/3 · precision 1/1 · link 0.78 · match 0.50`

(`threshold` 0.78, `match_threshold` 0.5)

Right or below: `©2026 NationGraph`

### Copy inventory (exact strings, current data)

| Surface | Copy |
|---|---|
| Masthead | `NationGraph` / `Research prototype` |
| Kicker | `Public record · cybersecurity procurement` |
| H1 | `The RFP is 317 days late.` |
| Problem | `Vendors learn about a purchase when the solicitation is published. By then the requirements are written.` |
| Thesis | `Buying intent is already in the board packet. This prototype found it.` |
| Corridor caption | `Charlotte County Public Schools · Firewall Software · board vote 9 Mar 2021 · E-rate RFP 20 Jan 2022` |
| Method kicker / H2 | `Method` / `124 documents. One factuality gate.` |
| Method p1 | `We read board agendas, minutes, budgets, and procurement files from 8 districts. Five made a known cybersecurity purchase in 2022. Three never did.` |
| Method p2 | `An event is kept only when a verbatim quote appears character-for-character in the source. District, date, and URL are stamped from the ledger, not the model.` |
| Method p3 | `Events about the same initiative are linked into trajectories, then scored against the real 2022 solicitations. Every source document pre-dates its outcome.` |
| Result kicker / H2 | `Backtest` / `One hit. Zero false alarms.` |
| Limit kicker / H2 | `Limit` / `1 of 5. The miss is the sample.` |
| Limit body | `The prototype covered 1 of 5 known purchases. Four buying trails never appeared in the 124 documents we read. The fix is more documents per district, not a smarter model.` |
| Jury row labels | `Known 2022 purchases` / `Never bought` |
| Jury captions | `1 of 5 recovered` / `0 of 3 controls fired` |
| Silent caption | `Four purchases left no trail in this sample.` |

## Visualizations

Five instruments. None decorative. Each 5-second takeaway is a sentence a stranger could repeat.

### V1 — Lead corridor (hero)

**Shows.** The wait. Left pole is the board vote; right pole is the RFP; the span is 317 empty days.

**Data.** `featured.firstDate` ← trajectory `first_date` `2021-03-09`; `featured.outcome.date` ← `2022-01-20`; `featured.leadDays` ← `317`; labels `Board vote` and `RFP`; orange on the RFP pole only.

**Technique.** CSS, not a chart SVG. A flex row (`flex-col sm:flex-row`) of three parts: start cluster, growing span, end cluster. The span is a 2px-tall (`sm`) / 2px-wide (mobile vertical) bar, `background: #2d8657`, `transform-origin: left` (or `top` on mobile), `animation: grow-x 1.1s cubic-bezier(0.22, 1, 0.36, 1) both`. Day ticks: `background-image: repeating-linear-gradient(to right, #dcdcdb 0 1px, transparent 1px 4px)` clipped to the growing bar so ticks appear as the bar grows. The number `317 days` sits on the span, Helvetica Neue ~32px tabular-nums, `animation: fade-in 0.5s ease 0.7s both` (`tw-animate-css` `animate-in fade-in delay-700`). Poles: 10px filled circle `#2d8657` (start); 10px hollow circle, `box-shadow: inset 0 0 0 2px #f4900a` (end). On `view()` support, the grow animation uses `animation-timeline: view(); animation-range: entry 0% cover 35%` so a returning scroll re-explains. Reduced motion: `transform: none`, number and bar at rest.

**5 seconds.** A public vote sat 317 days before anyone published the RFP.

### V2 — Quote sweep (hero)

**Shows.** The sentence that was already public. Not a prediction.

**Data.** `featured.events[0].quote.text` ← `20/21-40GH Sinnott Wolach Technology Firewall Software, eRate LTT 37939708007400691 $179,820`. Mark `$179,820` and `Firewall Software` as `<mark>` spans.

**Technique.** Blockquote, Geist italic 18–20px, padding-left 1rem, border-left 2px `#2d8657`. `mark` has `background-image: linear-gradient(#d9f2e5, #d9f2e5)`, `background-repeat: no-repeat`, `background-size: 0% 100%`, `animation: sweep-highlight 0.8s ease 1.1s forwards`. Keyframes: `from { background-size: 0% 100% }` `to { background-size: 100% 100% }`. Color `#d9f2e5` is brand tint, not yellow. Reduced motion: `background-size: 100% 100%` immediately.

**5 seconds.** This is a line from a board packet, with a vendor and a dollar amount, dated months before the RFP.

### V3 — Attrition field (method)

**Shows.** Survival, not volume theater. 124 documents enter; 4 events survive the quote gate; 1 matches a known buy.

**Data.** `sample.docs` 124 ticks; `sample.events` 4 survivors; `sample.clusters` 4 (same count today — do not draw a fake second clustering step as a different height if equal); `backtest.coverage.covered` 1 hit tick.

**Technique.** SVG, `width: 100%`, height ~72px, `aria-label="124 documents yielded 4 events; 1 matched."`. 124 `<rect>` width 1–2px, evenly spaced. Class `doc-tick`. CSS:

```css
.doc-tick { fill: #2d8657; opacity: 0; transform-box: fill-box; transform-origin: center bottom; animation: tick-in 0.35s ease both; animation-delay: calc(var(--i) * 8ms); }
@keyframes tick-in { from { opacity: 0; transform: scaleY(0.25); } to { opacity: 0.22; transform: scaleY(1); } }
.doc-tick.is-event { animation-name: tick-in-event; }
@keyframes tick-in-event { from { opacity: 0; transform: scaleY(0.25); } to { opacity: 1; transform: scaleY(1.8); } }
.doc-tick.is-hit { fill: #f4900a; }
```

`--i` set as an inline custom property on each rect (`style={{ ["--i"]: i }}`) — not Tailwind concatenation. The 4 event indices are `0, 1, 2, 3` mapped onto ticks near the end of the field (last four positions) so the eye sees mass → remainder, not a random sprinkle that implies we know which of the 124 files fired (we do not; `metrics.json` has no per-doc map). The last of those four gets `is-hit`. After the stagger, a 200ms pause, then non-event ticks stay at 0.22 opacity. Reduced motion: all ticks visible at rest, hit orange, events taller, no stagger.

Do not draw 124 fake document titles. Do not jitter heights to look “analytic.”

**5 seconds.** Almost every document produced nothing. Four quotes survived. One of those four is the purchase.

### V4 — Cohort jury (result)

**Shows.** The evaluation design: five known buys, three controls that never bought.

**Data.** Positives: `coverage.total` **5** cells; one filled, labeled from `featured.district` (`Charlotte County Public Schools`); four hollow, unlabeled. Controls: `control_fp.control_districts` **3** cells, all hollow; `control_fp.firing_districts` **0** so none fill. Citrus is *not* a filled control cell. An extract ≠ a firing.

**Technique.** Two rows of CSS grid squares, 44px, `border: 1px solid #dcdcdb`, `background: #fdfdfd`, radius 4px. Fill the hit with `#2d8657` via `animation: fill-cell 0.4s ease 0.5s forwards` (from transparent to `#2d8657`). Stagger cell entrance with `animate-in fade-in zoom-in-95` and literal delays `delay-100` … on the first eight children only (eight is `5+3`, still a literal class list in source, or `nth-child(-n+8)` in CSS). After fill, three control cells each get a CSS check: a 6px pair of borders forming a tick, `#2d8657`, `animation: fade-in 0.3s ease 0.9s both`. Caption under row A: `1 of 5 recovered`. Row B: `0 of 3 controls fired`. Reduced motion: hit already green, checks already visible.

**5 seconds.** We recovered one real purchase and did not alarm on districts that never bought.

### V5 — Silent cells (limitation)

**Shows.** Absence as the finding. Same five positive cells as V4, inverted emphasis.

**Data.** Identical roster: 1 filled, 4 empty. No new numbers.

**Technique.** Reuse the five-cell row. Empty cells use `animation: pulse-empty 1.2s ease 0.2s 1` — a single opacity 0.4 → 1 → 0.4 → 1 on the border color (`#dcdcdb` → `#9c9c98` → `#dcdcdb`), not a looping pulse (looping would feel like an alert). Filled cell stays still. Caption: `Four purchases left no trail in this sample.` Reduced motion: static, no pulse.

**5 seconds.** The prototype’s miss is missing documents, not a weak model.

Do not add a sixth “calendar heatmap.” Per-district-month counts are not in the JSON.

## Domain model

Wire JSON stays private to `lib/brief.ts`. Export only these types.

```ts
// lib/brief.ts

type EventState =
  | "DISCUSSION"
  | "WORKSHOP"
  | "BUDGET"
  | "AUTHORIZATION"
  | "SOLICITATION"
  | "AWARD"
  | "RENEWAL"
  | "OTHER";

type Quote = {
  text: string;
  url: string;
  sourceType: string;
  isWeb: boolean; // url matches /^https?:\/\//i
};

type BoardEvent = {
  date: Date; // parsed as UTC midnight from YYYY-MM-DD
  dateLabel: string; // "9 Mar 2021"
  state: EventState;
  stateLabel: string; // from STATE_LABEL registry, never a color
  action: string;
  vendor: string | null;
  amountUsd: number | null;
  summary: string;
  quote: Quote;
};

type Trajectory = {
  id: string;
  district: string;
  initiative: string;
  category: string;
  events: readonly [BoardEvent, ...BoardEvent[]]; // non-empty
};

type Outcome = {
  title: string;
  type: string;
  date: Date;
  dateLabel: string;
  url: string;
  isWeb: boolean;
};

type Hit = {
  kind: "hit";
  trajectory: Trajectory;
  outcome: Outcome;
  leadDays: number;
  similarity: number;
};

type NearMiss = {
  outcomeTitle: string;
  outcomeDateLabel: string;
  similarity: number; // < match_threshold
};

type Unmatched = {
  kind: "unmatched";
  trajectory: Trajectory;
  nearMiss: NearMiss | null; // null when comparison.similarity is null (citrus)
};

type Sample = { docs: number; events: number; clusters: number };

type Backtest = {
  coverage: { covered: number; total: number; rate: number };
  controls: { firing: number; total: number; rate: number };
  precision: { correct: number; labeled: number; rate: number };
  medianLeadDays: number | null;
  thresholds: { link: number; match: number };
};

type CorridorModel = {
  startLabel: string;
  endLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  days: number;
  caption: string;
};

type AttritionModel = {
  docs: number;
  events: number;
  clusters: number;
  matched: number;
  eventTickIndexes: number[]; // length === events, values in [0, docs)
  hitTickIndex: number | null;
};

type JuryModel = {
  positives: { filled: boolean; label: string | null }[]; // length === coverage.total
  controls: { fired: boolean }[]; // length === controls.total; fired from firing count, not from extracts
};

type Brief = {
  sample: Sample;
  backtest: Backtest;
  hits: Hit[];
  unmatched: Unmatched[];
  featured: Hit | null; // max leadDays among hits; null if none
  corridor: CorridorModel | null;
  attrition: AttritionModel;
  jury: JuryModel;
};

export function loadBrief(): Brief {
  throw new Error("not implemented");
  // TODO parse the three JSON modules into unknown
  // TODO validate: Object.keys(timelines) === Object.keys(comparison)
  // TODO validate: events flattened length === metrics.n_events
  // TODO validate: cluster count === metrics.n_clusters
  // TODO validate: hits.length === metrics.coverage.covered
  // TODO validate: if hits.length === 1, hits[0].leadDays === metrics.median_lead_days
  // TODO classify: comparison.matched && outcome_date && lead_days != null → Hit
  // TODO else Unmatched; nearMiss only when similarity != null
  // TODO featured = hits.reduce by leadDays
  // TODO corridor from featured; jury positives: featured label in slot 0, rest unlabeled
  // TODO jury controls: Array.from({length: controls.total}, (_, i) => ({ fired: i < firing }))
  // TODO attrition: event ticks = last n_events positions; hit = last of those if featured
}

export function formatUsd(amount: number): string {
  throw new Error("not implemented");
  // TODO Intl.NumberFormat en-US currency USD, no cents if integer
}

export function formatRate(rate: number, total: number): string {
  throw new Error("not implemented");
  // TODO total === 0 ? "Not measured" : `${Math.round(rate * 100)}%`
}
```

**Registries** (single source, not scattered in JSX):

```ts
const STATE_LABEL: Record<EventState, string> = {
  DISCUSSION: "Discussion",
  WORKSHOP: "Workshop",
  BUDGET: "Budget",
  AUTHORIZATION: "Authorization",
  SOLICITATION: "Solicitation",
  AWARD: "Award",
  RENEWAL: "Renewal",
  OTHER: "Other",
};

type BeatId = "hero" | "method" | "result" | "limit";
// Copy templates live next to BriefView as functions of Brief, not as a CMS Beat[].
// A generic Beat renderer was considered and rejected (see Alternatives).
```

Invariants encoded in types, not comments:

- A `Hit` always has `outcome` and `leadDays`. The corridor cannot be built from `Unmatched`.
- `Unmatched.nearMiss` cannot supply `leadDays`.
- `events` is non-empty, so `featured.events[0].quote` is safe.
- `jury.positives.length === backtest.coverage.total` by construction in `loadBrief`.
- `fired` on controls is a prefix of length `firing`, not “has an extract.”

`page.tsx` never switches on `comparison.matched`. It switches on `brief.featured` and maps `brief.hits` / `brief.unmatched`.

## Module map

| File | Change | Server / client | Why |
|---|---|---|---|
| `app/layout.tsx` | Replace Bricolage Grotesque + Instrument Sans + Newsreader with `Geist` + `Geist_Mono`. Set `--font-heading` consumers via class on `<html>`. Update metadata fallback title/description. | Server | Brand fonts. Helvetica Neue is CSS, not `next/font`. |
| `app/globals.css` | Remap `:root` to hex brand tokens (`#fafafa`, `#191818`, `#2d8657`, `#dcdcdb`, …). `--radius: 0.25rem`. `--font-heading: "Helvetica Neue", Arial, sans-serif`. Add `@keyframes grow-x`, `grow-y`, `sweep-highlight`, `tick-in`, `tick-in-event`, `fill-cell`, `pulse-empty`. `@supports` view-timeline rules. `@media (prefers-reduced-motion: reduce)` snap-to-end. Drop unused `.dark` or leave inert — do not ship a dark marketing page. | Global CSS | Tokens + motion. Tailwind v4 `@theme`. |
| `lib/brief.ts` | **New.** `loadBrief` + types + formatters. Only module that imports `@/out/*.json`. | Server-only | Deep module. Boundary validation. |
| `app/page.tsx` | **Rewrite.** `generateMetadata` + `loadBrief()` + `<BriefView>` or `<EmptyBrief>`. ~40 lines. | Server | Thin shell. |
| `components/brief-view.tsx` | **New.** Masthead, five sections, copy, evidence cards, receipt. Imports viz components. Uses `Badge`, `Empty`. No Accordion, Separator, Item, Button. | Server | Presentation. Adding a trajectory does not add a section. |
| `components/viz.tsx` | **New.** `LeadCorridor`, `QuoteSweep`, `AttritionField`, `CohortJury`, `SilentCells`. Props are the `*Model` types. | Server | CSS/SVG only. One file so motion tokens stay in one place (`short call chains`). |
| `components/ui/*` | Unchanged. Consume `badge`, `empty` only. | as today | Do not grow the shadcn surface. |

Call chain: `page.tsx` → `loadBrief` → `BriefView` → `viz.tsx`. Three files on the read path. No `sections/hero.tsx` family (temporal decomposition).

Pseudocode for `BriefView` composition:

```tsx
export function BriefView({ brief }: { brief: Brief }) {
  throw new Error("not implemented");
  // masthead
  // hero: H1 from brief.featured?.leadDays ?? fallback; problem + thesis copy
  // if brief.corridor: <LeadCorridor model={brief.corridor} />
  // if brief.featured: <QuoteSweep quote={brief.featured.trajectory.events[0].quote} />
  // method copy; <AttritionField model={brief.attrition} />; four sample numbers
  // result copy; three backtest numbers; <CohortJury model={brief.jury} />
  // brief.hits.map(HitCard); brief.unmatched.map(UnmatchedCard)
  // limit copy; <SilentCells positives={brief.jury.positives} />
  // receipt from brief.sample + brief.backtest
}
```

Next 16 notes: `generateMetadata` in a server page is valid. JSON imports remain `import metrics from "@/out/metrics.json"`. Do not add `use client` to `page.tsx` (would kill metadata and ship the dataset to the browser). `Geist` from `next/font/google` — confirm export against `node_modules/next/dist/docs/` at implement time; if the Google helper name differs, use the documented helper, not a guessed package. Turbopack is required; do not touch webpack config.

## Synthesis decision

Filled in by arena.

## Tradeoffs accepted

- We accept a Charlotte-centric hero (one quote, one corridor) in exchange for a 10-second thesis. Additional hits later still bind the H1 number to `median_lead_days` and feature the longest lead; they do not become four equal dashboard tiles.
- We accept unlabeled silent cells (4 of 5, 2 of 3 controls unnamed) in exchange for never inventing district names absent from the JSON artifacts.
- We accept hiding unmatched `lead_days` (254, 296) in exchange for not teaching the visitor a second, false “win.”
- We accept zero client JavaScript in exchange for no count-up, no IO choreography, and no accordion. CSS `view()` plus load fallback is the motion budget; Safari gaps are an open question, not a Motion library.
- We accept a single-color event language in exchange for brand fidelity. State is a word (`Solicitation`), not a rainbow legend that implies a deep taxonomy on four rows.
- We accept 124 anonymous ticks (last four highlighted) in exchange for not pretending we have a per-document attribution field.
- We accept dropping Newsreader in exchange for the live-site type system. Evidence is a quote with a green rule, not a serif costume.
- We accept not showing “~1 document per district-month” in exchange for the number rule. The limitation copy uses 1/5 and 124 only.
- We accept `Separator` unused (it is already `"use client"`) in exchange for a fully server page.

## Alternatives considered

- **Dashboard of four equal cases (today’s shape).** The page imports wire JSON and lets the visitor join hit vs miss. Interface is wide (raw trajectories, comparison, metrics, chart rows) and shallow (no policy). Lost: the thesis is case 01 in an accordion; 10-second rubric fails; rainbow + accordion fake scale.
- **Story-as-`Beat[]` generic renderer.** A deep-looking CMS: `{ kind, copy, viz }[]` mapped to a switch. Public surface grows (every beat kind, every viz discriminant) while hiding nothing — copy edits move to data, layout still special-cases hero vs limit. Lost on interface depth: a five-section letter does not need a scene graph (`subtract-before-you-add`).
- **Client scroll theater (IntersectionObserver per section, count-up 0→317).** Motion becomes an application. Callers coordinate refs, thresholds, and reduced-motion JS. Violates CSS-first and “client only where CSS cannot.” Lost: decoration, not explanation; the corridor grow + quote sweep already explain.
- **Named 8-district map from `data/raw/` folders.** Would label Flagler, Hernando, Hillsborough, Alachua, Nassau. Richer jury, stale the moment the ledger changes, and those names are not in the three sanctioned files. Lost on data-driven honesty.
- **Keep accordion + shadcn Card chrome for evidence.** Implies a long corpus. Four quotes are the entire event set; collapsing them is anti-honesty. Lost.

## Open questions and risks

- Should the Citrus extract get an explicit “not a false alarm” line (as specified) or is the `0 / 3` figure enough without inviting a methodology debate on the page?
- If `hits.length > 1` in a future run, is “longest lead” the right `featured` rule, or should the page switch to a median-only headline and a multi-corridor?
- Scroll-driven `animation-timeline: view()` support on the team’s target browsers: ship `@supports` + load fallback (specified), or skip view timelines entirely and only animate on load?
- `Geist` import path under Next 16.3.2 — confirm in `node_modules/next/dist/docs/` before writing `layout.tsx`. If `Geist` is not exported from `next/font/google` in this version, what is the documented substitute that still yields the Geist family?
- Helvetica Neue is often missing on Windows; Arial will carry headings. Is that acceptable brand fidelity, or should we load a licensed Neue that the marketing site does not use?
- Local evidence URLs cannot be opened in the browser. Is “Local board_agenda_packet” enough, or should implementation later add a static-file route? Out of scope for this page if it requires new infra.

## Next implementation step

Remap `app/layout.tsx` fonts and `app/globals.css` tokens (including keyframes and reduced-motion), then implement `loadBrief()` against the three JSON files so `page.tsx` can render from a `Brief` on the next pass.
