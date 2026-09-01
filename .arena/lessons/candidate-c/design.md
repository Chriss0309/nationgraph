# Candidate C — Guided recap

The closer is a reading guide for someone who just scrolled a page they did not fully understand. It is a table: each of the five prior beats collapses to one takeaway. A single next-run figure sits beside the table. It is not a fourth essay, not a second homepage, and not a flat list of tips.

## Problem

The results page already argues, in order: vendors hear about a purchase when the RFP goes public (Hero); the intent was sitting in an agenda packet (Exhibit A); the pipeline keeps only quoted events and links them into trajectories (Method); this run produced one clean hit and zero control false alarms (Result); it found one of five known purchases because the paper never entered the corpus (Limitation). `components/results/lessons.tsx` then adds a sixth beat that does not teach a cold reader. It assumes the visitor already lives in the protocol — "quote gate", "denominators", "locked holdout", "headline thesis" — and restates four research-lab morals in the same numbered hairline pattern as Method. The holdout cell grid is real (`data/DATASET.md`: development 5+3, locked holdout 15+7) but it does not show the thesis. A visitor who just learned what an RFP is cannot leave knowing what was being proved.

The non-obvious shape question is how to close without writing a second homepage and without repeating Limitation or Method. Constraints the design must honor: `page.tsx` stays a thin composer and keeps `<Lessons metrics={dossier.metrics} />`; every displayed number traces to `DossierMetrics` or the documented 15+7; `Reveal` is the only client island; orange `#f4900a` is reserved for RFP moments; light-only dossier tokens; no new dependencies; surgical — no visual rewrite of earlier sections. The organizing structure the implementation must name is a table of beat → takeaway, plus one figure chosen because it carries the next step, not because it looks busy.

## Usage (caller's view)

The caller is `app/page.tsx`. It does not assemble recap rows. It does not choose a figure kind. It does not pass holdout counts. It already loaded the dossier; Lessons consumes the same metrics object every other closer-adjacent section uses.

```tsx
// app/page.tsx — the only page call site. Unchanged.
<Limitation
  coverage={dossier.metrics.coverage}
  hit={dossier.hit}
  precision={dossier.metrics.precision}
/>
<Lessons metrics={dossier.metrics} />
```

Inside Lessons, one function returns the whole closer. The view iterates a fixed beat order. It never branches on "which figure" and never builds a sixth row.

```tsx
// components/results/lessons.tsx — the view call site
export function Lessons({ metrics }: { metrics: DossierMetrics }) {
  const recap = buildGuidedRecap(metrics);

  return (
    <section>
      <p className="section-kicker">{recap.kicker}</p>
      <h2 className="section-title">{recap.title}</h2>
      <p className="section-lede">{recap.lede}</p>
      <table>
        <caption className="sr-only">{recap.tableCaption}</caption>
        <tbody>
          {PRIOR_BEATS.map((beat) => (
            <RecapRowView key={beat} row={recap.table[beat]} />
          ))}
        </tbody>
      </table>
      <Reveal>
        <NextRunFigureView figure={recap.figure} />
      </Reveal>
    </section>
  );
}
```

A pipeline re-run is the third call site. No React file changes. Copy variants flip because the table is derived, not hardcoded.

```
# uv run trajectory.py all
# writes out/metrics.json (and the join in loadDossier)
# if events > clusters, the Method row stops saying "every trajectory is a single meeting"
# if a control fires, the Result row stops saying "all three stayed quiet"
# cell counts on the next-run figure follow coverage.total and controls.total
# 15 and 7 do not move; they are protocol, not metrics
```

A test reads the table the way a cold reader would: five keys, one bound term per beat, lesson sentences that define those terms, one figure, no caller-supplied rows.

```ts
// tests/recap.test.ts — the assertion call site
const recap = buildGuidedRecap(metrics);
expect(Object.keys(recap.table)).toEqual([...PRIOR_BEATS]);
expect(recap.table.problem.term).toBe("RFP");
expect(recap.table.exhibit.term).toBe("quote rule");
expect(recap.table.method.term).toBe("trajectory");
expect(recap.table.result.term).toBe("control district");
expect(recap.table.limitation.term).toBe("coverage");
expect(recap.figure.lanes).toHaveLength(2);
```

If someone tries to pass holdout size, figure kind, or a list of lessons into `Lessons`, that call site is wrong. The public surface is one prop.

## Shape

**The closer is a recap table plus a next-run figure.** Data structures first. The dominant access pattern is "walk the five prior beats in page order, paint one sentence each, then paint one figure." If the answer is "we'll add a map of lesson ids later," the structure is wrong. The page order *is* the table order.

### Types

```ts
// components/results/recap.ts

import {
  formatCount,
  formatSimilarity,
  type DossierMetrics,
} from "@/lib/dossier";

/** The five beats the visitor already scrolled, in page order. */
export const PRIOR_BEATS = [
  "problem",
  "exhibit",
  "method",
  "result",
  "limitation",
] as const;

export type PriorBeat = (typeof PRIOR_BEATS)[number];

/**
 * The term each row must re-explain in its lesson sentence.
 * Bound in the type so a Method row cannot carry "coverage"
 * and a glossary column cannot appear. Not painted.
 */
export const RECAP_TERM = {
  problem: "RFP",
  exhibit: "quote rule",
  method: "trajectory",
  result: "control district",
  limitation: "coverage",
} as const satisfies Record<PriorBeat, string>;

export type RecapTerm<B extends PriorBeat = PriorBeat> =
  (typeof RECAP_TERM)[B];

/** Reading-guide index labels. Not 01–05 — that is Method. */
export const BEAT_LABEL = {
  problem: "Problem",
  exhibit: "Exhibit",
  method: "Method",
  result: "Result",
  limitation: "Limit",
} as const satisfies Record<PriorBeat, string>;

export type BeatLabel<B extends PriorBeat = PriorBeat> =
  (typeof BEAT_LABEL)[B];

export type RecapRow<B extends PriorBeat = PriorBeat> = {
  readonly beat: B;
  readonly label: BeatLabel<B>;
  readonly term: RecapTerm<B>;
  readonly lesson: string;
};

/** A complete table: every prior beat present, no sixth beat. */
export type RecapTable = { readonly [B in PriorBeat]: RecapRow<B> };

export type LaneFill = "solid" | "dashed";
export type LaneKind = "positive" | "control";

export type NextRunCell = {
  readonly kind: LaneKind;
  readonly fill: LaneFill;
  readonly index: number;
};

export type NextRunLane = {
  readonly id: "development" | "holdout";
  readonly eyebrow: string;
  readonly tally: string;
  readonly fill: LaneFill;
  readonly positives: number;
  readonly controls: number;
  readonly cells: readonly NextRunCell[];
};

export type NextRunFigure = {
  readonly title: string;
  readonly thesis: string;
  readonly lanes: readonly [NextRunLane, NextRunLane];
  readonly legend: readonly [
    { readonly kind: "positive"; readonly label: string },
    { readonly kind: "control"; readonly label: string },
  ];
  readonly caption: string;
  readonly ariaLabel: string;
};

export type GuidedRecap = {
  readonly kicker: "Recap";
  readonly title: string;
  readonly lede: string;
  readonly tableCaption: string;
  readonly table: RecapTable;
  readonly figure: NextRunFigure;
};

/** Protocol counts from data/DATASET.md. Not in DossierMetrics. */
export const LOCKED_HOLDOUT = { positives: 15, controls: 7 } as const;
```

Invariants encoded in types (`encode-lessons-in-structure`):

- Exactly five recap rows, keyed by `PriorBeat`. A four-row lessons list will not typecheck. A "next" beat will not typecheck. Next lives on `GuidedRecap.figure`.
- Each beat is bound to one term. The renderer does not print `term`. The builder must still produce a `RecapRow` whose `term` field matches `RECAP_TERM[beat]`. That is the reminder that the lesson sentence re-explains that word in passing.
- The figure is one kind, always: two lanes, development then holdout. There is no `figure.kind` union. Choosing a viz is not a caller problem.
- Cell arrays are derived from `positives` + `controls` + `fill`. The view does not recount.
- Holdout 15+7 is a constant in this module, not a `Lessons` prop and not a magic number in JSX.
- `DossierMetrics` is the only run input. Wire JSON never appears here (`boundary-discipline`).

What the types deliberately do not encode: district names, the Charlotte hit, lead days, the evidence quote, or a second coverage grid. Those belong to earlier sections.

### Signatures

```ts
/**
 * Derive the recap table and the next-run figure from this run's metrics.
 *
 * Pure. Same metrics → same GuidedRecap. Trust DossierMetrics; dossier.ts
 * already validated the artifact boundary.
 *
 * Copy policy lives here: single-meeting vs multi-meeting Method row,
 * quiet vs firing Result row, missed-count Limitation row. Figure policy
 * lives here: lane tallies from coverage.total / controls.total and
 * LOCKED_HOLDOUT. Callers do not pass rows or pick a figure.
 */
export function buildGuidedRecap(metrics: DossierMetrics): GuidedRecap {
  throw new Error("not implemented");
  // TODO: missed = max(0, coverage.total - coverage.covered)
  // TODO: singleMeeting = events === clusters
  // TODO: controlsQuiet = controls.fired === 0
  // TODO: interpolate the five bound templates (see Copy templates)
  // TODO: lanes = [lane("development", coverage.total, controls.total, "solid", 0),
  //                lane("holdout", 15, 7, "dashed", coverage.total + controls.total)]
}

function buildLane(
  id: NextRunLane["id"],
  positives: number,
  controls: number,
  fill: LaneFill,
  indexOffset: number,
): NextRunLane {
  throw new Error("not implemented");
  // TODO: cells = positives positives then controls controls, index = offset + i
}

/** Public view. One prop. page.tsx already calls this. */
export function Lessons(props: { metrics: DossierMetrics }): JSX.Element;

/** Beat label + one lesson. No title, no index number, no term column. */
function RecapRowView(props: { row: RecapRow }): JSX.Element;

/** One viz. Reveal wraps this. Reuses .nextrun-cell. No orange. */
function NextRunFigureView(props: { figure: NextRunFigure }): JSX.Element;
```

`buildGuidedRecap` is a private collaborator of Lessons. `page.tsx` does not import it. That keeps the public surface one component deep (`interface depth`): the capability hidden behind `Lessons({ metrics })` is beat order, term binding, copy variants, holdout protocol, cell construction, and the refusal list. What remains exposed is the metrics the page already has.

Validation lives at the dossier boundary, not here. Business logic is the pure builder. The shell (`Lessons`) is layout, tokens, and `Reveal`.

Single source of truth: missed purchases are `coverage.total - coverage.covered`, not a second constant. Single-meeting is `events === clusters`, the same test the current file already uses. Holdout size is `LOCKED_HOLDOUT` once.

### Module map

```
app/page.tsx                      thin composer; still <Lessons metrics={dossier.metrics} />
lib/dossier.ts                    unchanged. DossierMetrics is the only run input.
components/results/recap.ts       types, PRIOR_BEATS, RECAP_TERM, BEAT_LABEL,
                                  LOCKED_HOLDOUT, buildGuidedRecap, buildLane
components/results/lessons.tsx    Lessons, RecapRowView, NextRunFigureView
components/results/reveal.tsx     unchanged island
app/globals.css                   reuse .nextrun-cell / stamp-in. no new keyframes
data/DATASET.md                   cited by LOCKED_HOLDOUT; not imported
```

Call chain is three steps: `loadDossier` → `Lessons` → `buildGuidedRecap`. No fourth layer. `RecapRowView` and `NextRunFigureView` are not pass-throughs; they adapt a domain view-model onto dossier tokens (hairline table, `figure.viz`, `Reveal`). They do not re-derive counts.

Files this design will not touch: `hero.tsx`, `exhibit-card.tsx`, `method.tsx`, `backtest.tsx`, `limitation.tsx`, `receipt.tsx`. C re-explains terms in the recap sentences, so no earlier wording pass is required.

## Figure spec

One figure. Kind is not selectable. It earns its place by showing the only fact the five takeaways do not already contain: the next run's scale, and the condition for opening it.

```
figure.viz  role="img"  aria-label={figure.ariaLabel}
  h3.figure-title     "The next run"
  p.thesis            one sentence: what the next run must show (see copy)
  lane development    eyebrow + tally + solid cells (nextrun-cell)
                      positives: border-ng-green-300 bg-ng-green-100
                      controls:  border-border bg-muted
  lane holdout        eyebrow + tally + dashed empty cells
                      positives: border-dashed border-ng-green-300 bg-transparent
                      controls:  border-dashed border-border bg-transparent
  legend              2px swatches: "positive outcome" · "control district"
p.caption             protocol freeze line, below the figure
```

Layout: same two-column split as Method (`lg:grid-cols-[0.9fr_1.1fr]`). Table left, figure right. Mobile: table first (the reading guide), figure second (the next step). That is the C reading order.

Animation: existing `.nextrun-cell` stamp-in, `--i` sequenced across both lanes so it is one motion. Base CSS is the final frame (`both` fill). `prefers-reduced-motion: reduce` already kills `.viz *`. No-JS shows the filled/dashed cells. `Reveal` is the only island.

Orange is not used. This figure does not mark an RFP.

What the figure is not:

- Not Limitation's five coverage tiles (found / not in sample / hatch). Those already said 1 of 5.
- Not Method's 124-cell funnel. That already said docs → events → trajectories → match.
- Not a meeting-chain drawing that ends in an orange RFP node. That redraws Hero and Exhibit and invents meeting counts this run does not have.
- Not five decorative arrows collapsing into one. That restates the table without adding the 15+7 fact.

The thesis line above the lanes is what the current cell grid is missing. The cells alone are protocol inventory. The thesis line names the claim the next run has to exercise: follow one purchase across meetings before the RFP, on this same development set, then freeze and open the holdout.

Legend reuses "control district" after the Result row has defined it. That is intentional reuse, not a glossary dump.

## Copy templates

Kicker, title, lede, and table caption are invariant. Row bodies interpolate. Current-run bindings from grounding: 124 documents, 4 events, 4 trajectories, 1 match, 1 of 5 covered, 0 of 3 controls fired, link 0.78, match floor 0.50. Templates never hardcode those digits; they read `metrics`. Values in braces below are the bound output a visitor would see today.

### Frame

```
kicker:         Recap
title:          Keep these five lines.
lede:           Each earlier beat collapses to one lesson. The figure is the only next step they share.
tableCaption:   Recap of the five prior beats, each collapsed to one takeaway.
```

The title is a reading-guide instruction, not a second claim. It does not restate "Know 317 days before the RFP drops."

### Table — beat → takeaway

The renderer paints `label` and `lesson` only. `term` is the type-level binding, not a third column. Each lesson re-explains its term in the same sentence that states the takeaway. No row title. No 01–05.

**problem** · term `RFP`

```
The RFP is only the public request for proposals; the lesson of the opening is that the purchase was already sitting in ordinary board paper before that request existed.
```

Invariant copy. Hero already defined the RFP; this row keeps the definition attached to the takeaway so a skimmer who missed the hero still leaves with both.

**exhibit** · term `quote rule`

```
The quote rule keeps only a line that appears in the source character for character — which is why Exhibit A is one agenda sentence a visitor can check, and why scanned or paraphrased minutes never made it onto this page.
```

Invariant copy. Names the cost of the rule (scanned / paraphrased paper drops) without turning OCR into a sixth lesson.

**method** · term `trajectory`

Variant A — `metrics.events === metrics.clusters` (this run):

```
A trajectory is the paper trail of one purchase forming across meetings; this run linked {formatCount(events)} events into {formatCount(clusters)} trajectories, and every one is still a single meeting.
```

Today: "A trajectory is the paper trail of one purchase forming across meetings; this run linked four events into four trajectories, and every one is still a single meeting."

Variant B — `metrics.events > metrics.clusters`:

```
A trajectory is the paper trail of one purchase forming across meetings; this run linked {formatCount(events)} events into {formatCount(clusters)} trajectories, so at least one purchase now spans more than one meeting.
```

Does not recap Collect / Extract / Link / Backtest. Does not recap the funnel counts as a pipeline tour.

**result** · term `control district`

Variant A — `metrics.controls.fired === 0` (this run):

```
A control district is a peer with no matching cybersecurity purchase in the searched window; all {formatCount(controls.total)} stayed quiet, so the pipeline did not invent a buy where none happened.
```

Today: "A control district is a peer with no matching cybersecurity purchase in the searched window; all three stayed quiet, so the pipeline did not invent a buy where none happened."

Variant B — `metrics.controls.fired > 0`:

```
A control district is a peer with no matching cybersecurity purchase in the searched window; {formatCount(controls.fired)} of {formatCount(controls.total)} fired, which is the false-alarm count this run actually earned.
```

Does not recap 317 days, the similarity ledger, or 1/1 precision.

**limitation** · term `coverage`

```
Coverage is how many known purchases the paper trail reached — {formatCount(coverage.covered)} of {formatCount(coverage.total)} here — because the other {formatCount(missed)} never put a usable trail in the corpus.
```

Today: "Coverage is how many known purchases the paper trail reached — one of five here — because the other four never put a usable trail in the corpus."

Does not say "the fix is more documents, not a smarter model." Limitation already said that. The next-run figure is where "so collect deeper" lives.

### Figure

```
title:     The next run
thesis:    The next hours go to deeper paper on these same {coverage.total} + {controls.total} districts, so a trajectory can actually cross meetings. Then the prompt, the {formatSimilarity(linkThreshold)} link threshold, and the {formatSimilarity(matchFloor)} match floor freeze, and the locked holdout opens.
```

Today: "The next hours go to deeper paper on these same 5 + 3 districts, so a trajectory can actually cross meetings. Then the prompt, the 0.78 link threshold, and the 0.50 match floor freeze, and the locked holdout opens."

```
development.eyebrow:  This run · development
development.tally:    {coverage.total} positives + {controls.total} controls
holdout.eyebrow:      Locked holdout · still closed
holdout.tally:        {LOCKED_HOLDOUT.positives} positives + {LOCKED_HOLDOUT.controls} controls
legend.positive:      positive outcome
legend.control:       control district
caption:              Development numbers debug the pipeline. Only the untouched holdout — {LOCKED_HOLDOUT.positives} positives and {LOCKED_HOLDOUT.controls} controls the model has not seen — counts as evidence.
ariaLabel:            This development run used {coverage.total} positive and {controls.total} control districts. The locked holdout adds {LOCKED_HOLDOUT.positives} positives and {LOCKED_HOLDOUT.controls} controls after the prompt and thresholds are frozen. The next run must produce a multi-meeting trajectory before that holdout opens.
```

Words this copy refuses: quote gate, denominators, headline thesis, locked holdout as an undefined noun (the holdout sentence always says what it is), OCR as a lesson title.

## Visual consistency — not a second homepage

Stay inside the dossier:

- Section chrome: `section-kicker`, `section-title`, `section-lede`, `figure-title`, `figure.viz`. Alternating band: `border-b border-border bg-card`, same as Exhibit A and the current Lessons.
- Hairline rows: `border-t border-border py-5`. The row is a table row, not a Method step. First column is a mono beat label (`font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground`), the same voice as case kickers and figure eyebrows. Second column is `text-sm leading-6 text-muted-foreground`.
- `Reveal` wraps only the figure. The table is static, like Method's steps, so a no-JS and reduced-motion reader gets the five lines immediately.
- Cells reuse `.nextrun-cell` and the existing stamp-in. No new keyframes. No `stat-cell` row (Result owns that). No lead ruler. No evidence card. No orange chip.

Refuse homepage energy:

- No `min-h-svh`, no clamp hero type, no restated 317-day headline.
- No second quote, no second coverage hatch, no second funnel.
- No per-row `<h3>`. Title-less rows are what make this a table rather than five mini-essays. Five headings would recreate the current flat list and compete with `section-title`.
- No numbered 01–05 index. Method already used that grammar for pipeline stages. Recap uses named beats so the visitor can map back to the sections they scrolled past.
- Width stays `max-w-7xl px-5 py-20 sm:px-8 sm:py-28`. It is another dossier band, not a new landing page.

The HTML is a `<table>`, not an `<ol>`. Method is a sequence of stages; this is a lookup from beat to takeaway. Screen readers hear "Problem, The RFP is only…" instead of "1, Paper was the bottleneck." Style the table to collapse like the existing hairline list (`w-full border-collapse`, no grid chrome, no zebra). If it starts looking like a data spreadsheet, the CSS is wrong, not the element.

## What this refuses to recap

C is a reading guide, not a digest of every number on the page. If Limitation or Method already made the point, the recap does not make it again.

**From Method — already said, do not recap:**

- The four stages (Collect, Extract, Link, Backtest) and "nothing appears unless it survived all four."
- The 124 → 4 → 4 → 1 funnel animation and its survivor cells.
- "District, date, and URL come from the source ledger, never from the model."
- The link threshold and match floor as method mechanics. They may appear in the figure thesis as freeze conditions, not as a tour of how linking works.

**From Limitation — already said, do not recap:**

- "It found 1 of 5" as a restated title.
- The five-district coverage grid (found / not in sample / hatch / Charlotte label).
- "The fix is more documents per district, not a smarter model."
- "Recall is a data problem; precision held at 1/1."
- Naming the hit district again.

**From Hero, Exhibit, Result — already shown, do not rebuild:**

- The lead ruler and "Know N days before the RFP drops."
- The full evidence quote, vendor / amount / board-action annotations, orange RFP chip.
- The 317-day stat tile, control-panel tiles, similarity ledger, case dossier.

**From Receipt — comes after, do not preview:**

- The metric dump. Lessons is not a second footer.

**From the current Lessons file — the shape C replaces:**

- Four numbered morals: paper bottleneck, quote gate cuts both ways, headline thesis under-exercised, tiny denominators prove little.
- Insider words: quote gate, denominators, headline thesis.
- OCR as a standalone next action. Scanned paper is a clause in the Exhibit row; deeper collection is the figure thesis.

The paper-bottleneck moral is the sharpest refusal. It is true, and Limitation already owns it. Putting it in Lessons again is how the closer becomes a second Limitation. C's Limitation row defines coverage; C's figure says what to do next.

## Synthesis decision

Deferred to arena synthesis. This package is the C-shape only: a beat → takeaway table plus one next-run figure. It does not flatten to four lessons and it does not collapse the five beats into a single thesis paragraph.

## Tradeoffs accepted

- We accept five rows instead of four in exchange for a closer that maps onto the page the visitor just scrolled. Collapsing back to four would be a different candidate.
- We accept that Problem and Exhibit rows barely interpolate in exchange for a complete beat table. Those beats do not have run-varying lessons; the structure still needs the rows.
- We accept title-less table rows (harder for a returning researcher to scan by heading) in exchange for not looking like Method's titled lesson list.
- We accept the existing cell-lane viz plus a thesis line, rather than a new meeting-chain drawing, in exchange for not becoming a second homepage and not inventing geometry `DossierMetrics` does not contain.
- We accept a `Recap` kicker against Hero's promised word "lessons" in exchange for naming the organizing structure. The component is still `Lessons`.
- We accept that "control district" is fully defined only in the Result recap row, even though Backtest already showed a control panel, in exchange for no surgical rewrite of earlier sections.
- We accept `components/results/recap.ts` as a second file in exchange for keeping the view-model out of `lib/dossier.ts` and out of `page.tsx`.

## Alternatives considered

- **Numbered 01–05 rows with title + body, same grid as `MethodStep`.** This is the current Lessons shape with a fifth item taped on. It exposes a lesson-essay interface (index, title, body) and hides nothing about how the closer relates to the page. The beat → takeaway table hides that mapping behind one walk of `PRIOR_BEATS`. Rejected: it is a flat list, which is a different organizing structure.
- **Visible glossary column (beat · term · definition · lesson).** Callers and readers then coordinate four cells to finish one thought. Interface gets larger; the cold-reader sentence gets weaker. Terms must be defined in the takeaway sentence, not dumped beside it. Rejected on interface depth and on the glossary-dump constraint.
- **Sixth table row named "Next".** Moves the next step into the table and leaves the figure as decoration. Rubric: a figure that does not change what the reader understands fails. Next is a figure, not a beat. The five beats already happened; the next run has not.
- **Meeting-chain next-run viz (isolated dots → chained meetings → orange RFP).** Hides protocol scale (15+7) and exposes a geometry the metrics cannot support. Uses reserved orange. Redraws Hero and Exhibit. Rejected: second homepage, invented counts, color-token leak.
- **Coverage-tile or funnel redux as the Lessons figure.** Information leakage: Limitation and Method already own those representations. Changing coverage presentation would require coordinated edits in two sections.
- **Caller-assembled rows (`<Lessons rows={…} figure={…} />`).** Shallow module. The page would learn copy policy, term binding, and figure kind. The whole point of `buildGuidedRecap` is that the page does not.

## Open questions and risks

- Should the kicker stay `Lessons` so it matches Hero's closing word ("the signal, the method, the result, the misses, the lessons"), or is `Recap` the right name for the C-shape? This sketch picks `Recap`.
- Is a `<table>` worth the CSS reset against the existing hairline `<ol>` grammar, or does a styled list with beat labels in the index column keep the dossier feel with less layout risk?
- Does the figure thesis plus the caption under the figure become two prose blocks too many for a cold reader, and if so which sentence dies — the thesis (loses the claim) or the caption (loses the freeze rule)?
- When `events === 0`, the Method row still types and still renders. Is "linked zero events into zero trajectories" acceptable, or should that row fall back to the definitional clause only?

## Next implementation step

Write `components/results/recap.ts` with the types, `LOCKED_HOLDOUT`, and `buildGuidedRecap` interpolating the five templates and both copy variants, then replace the numbered list in `lessons.tsx` with the beat table and the existing `nextrun-cell` lanes driven by `recap.figure`.

## Red-flag screen

- **Shallow module.** Rejected the caller-assembled-rows alternative. Public surface is `Lessons({ metrics })`.
- **Information leakage.** Holdout 15+7 lives in one constant. Coverage tiles and the funnel are not reimplemented. Wire JSON is not imported.
- **Temporal decomposition.** Not split into load / format / render modules that each repeat `DossierMetrics`. One builder owns recap knowledge; the view paints it.
- **Pass-through.** `Lessons` is not a one-line forwarder. It owns dossier layout and `Reveal`. `buildGuidedRecap` owns policy, not a typed wrapper around four hardcoded strings.
