# Candidate B — thesis-first closer. The figure is the missing meeting chain.

Parallel exploration sketch. Do not treat this as synthesized. Do not edit production files from this package.

## Problem

The results page already argues, in order: vendors learn about a purchase when the RFP goes public; the intent was sitting in ordinary school-board paper; this prototype keeps only character-for-character quotes, links events about the same initiative into trajectories, and grades those trajectories against later solicitations it never saw. Limitation has already said the run found 1 of 5 known purchases because the paper never entered. Lessons mounts next. It is the closer, not a second closer.

The live closer fails a cold reader. Its hero figure is a development-vs-holdout cell grid (5+3 filled, 15+7 dashed). That grid is real protocol from `data/DATASET.md`, and it is the wrong object. The headline claim is temporal entity resolution: follow one purchase across public meetings before the RFP. This development run produced 4 events and 4 trajectories. Every surviving trail is a single meeting. The multi-meeting chain appears only in fixtures. A visitor who just learned what an RFP is cannot leave able to say that.

Constraints this sketch must honor: `page.tsx` stays a thin composer and keeps `<Lessons metrics={dossier.metrics} />`. Every on-page number traces to `DossierMetrics` from `loadDossier()`. Holdout 15+7 may be cited only from `DATASET.md`, and this candidate chooses not to cite it. Zero new npm dependencies. `Reveal` stays the only client island. Orange `#f4900a` is reserved for RFP moments. Light dossier tokens only (`section-kicker`, `section-title`, `section-lede`, `figure-title`, `viz`). Base CSS is the final frame; `both` fill; `prefers-reduced-motion: reduce` already kills `.viz` motion; no-JS shows the complete page. Surgical: do not redesign Hero, Exhibit A, Method, Backtest, or Limitation. A table of lessons is derived from metrics. One figure is chosen because it carries the load-bearing claim.

The existing closer to beat: four hardcoded `LessonRow` branches (paper bottleneck, quote gate, thesis under-exercised, tiny denominators) plus the holdout cell grid. Method already defines a trajectory as events about the same initiative connected across meetings. Hero already defines an RFP. The closer must not assume the reader lives in the research protocol.

## Usage (caller's view)

The page caller does not choose a figure, assemble lesson rows, interpolate copy, or know that holdout exists. It already has a dossier. It passes metrics. That is the whole public surface.

```tsx
// app/page.tsx — the only production call site. Unchanged.
<Limitation
  coverage={dossier.metrics.coverage}
  hit={dossier.hit}
  precision={dossier.metrics.precision}
/>
<Lessons metrics={dossier.metrics} />
```

Inside `Lessons`, one derive hides figure policy and copy. The component does not re-derive counts in four JSX branches.

```tsx
// components/results/lessons.tsx — internal consumer of the table
const view = lessonsView(metrics);

// this run: view.figure.kind === "chainGap"
// view.copy.title === "I never followed one purchase across meetings."
// view.table.length is 3 or 4; each body already has numbers baked in

<section className="border-b border-border bg-card">
  <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
    <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
      <header>
        <p className="section-kicker">{view.copy.kicker}</p>
        <h2 className="section-title">{view.copy.title}</h2>
        <p className="section-lede">{view.copy.lede}</p>
      </header>
      <Reveal className="self-center">
        <LessonsFigureView figure={view.figure} />
      </Reveal>
    </div>
    <div className="mt-14 max-w-3xl">
      <h3 className="font-heading text-lg font-semibold tracking-[-0.02em]">
        {view.copy.listHeading}
      </h3>
      <ol className="mt-6">
        {view.table.map((lesson) => (
          <LessonRow
            key={lesson.id}
            body={lesson.body}
            index={lesson.index}
            title={lesson.title}
          />
        ))}
      </ol>
    </div>
  </div>
</section>
```

A later run that actually links meetings does not change the call site. The same import, the same prop, a different discriminant.

```tsx
// still app/page.tsx — if events > clusters, Lessons flips internally
<Lessons metrics={dossier.metrics} />
// view.figure.kind === "formedChain"
// view.copy.title === "A chain formed. The rest is still dots."
```

If the derive and the markup disagree, change the types. The caller's experience is the spec: one prop in, a thesis sentence the visitor can repeat, a figure that performs the missing chain, then a short list of what changes next.

## Shape

Data structures first. The closer owns three derived values and one public component. The load-bearing decision is that the primary figure kind is a chain-gap, not a sample-size grid, and that the thesis is spoken before anyone is told what to do differently.

### Types

```ts
import type { DossierMetrics } from "@/lib/dossier";

/** Stable ids. Order in the table is `index`, not enum order. */
type LessonId = "depth" | "quoteGate" | "noWiderSample" | "receiptNotEvidence";

interface Lesson {
  readonly id: LessonId;
  readonly index: 1 | 2 | 3 | 4;
  readonly title: string;
  /** Already interpolated. Renderers do not format metrics. */
  readonly body: string;
}

/** Three or four rows, all hanging off the missing-chain claim. */
type LessonTable = readonly Lesson[];

type ClaimedStopId = "workshop" | "budget" | "vote" | "rfp";

/**
 * Schematic thesis roles, not events from this run.
 * Naming a district or a real date here is a spec violation.
 */
interface ClaimedStop {
  readonly id: ClaimedStopId;
  readonly label: string;
  readonly isRfp: boolean;
}

interface IsolatedNode {
  readonly index: number;
  /** True for the first `metrics.matches` nodes. No district name. */
  readonly matched: boolean;
}

/**
 * Discriminated figure. `chainGap` is the primary variant and the
 * only one this development run can construct.
 *
 * Invariant: `chainGap` is legal only when
 * `isolatedCount === events && events === clusters && events > 0`.
 * `formedChain` is legal only when `events > clusters`.
 * `empty` is legal only when `events === 0`.
 */
type LessonsFigure =
  | {
      kind: "chainGap";
      isolatedCount: number;
      matchedCount: number;
      isolates: readonly IsolatedNode[];
      claimedStops: readonly ClaimedStop[];
      title: string;
      caption: string;
      ariaLabel: string;
    }
  | {
      kind: "formedChain";
      events: number;
      clusters: number;
      extraLinkedEvents: number;
      matchedCount: number;
      title: string;
      caption: string;
      ariaLabel: string;
    }
  | {
      kind: "empty";
      docs: number;
      title: string;
      caption: string;
      ariaLabel: string;
    };

interface LessonsCopy {
  readonly kicker: "Lessons";
  readonly title: string;
  readonly lede: string;
  readonly listHeading: "What I'd do differently";
}

interface LessonsView {
  readonly copy: LessonsCopy;
  readonly table: LessonTable;
  readonly figure: LessonsFigure;
}
```

`claimedStops` is a module-private constant copied onto the `chainGap` variant so the renderer stays data-driven. It is not sourced from `DossierMetrics` and must not grow district names, dates, or invented meetings.

```ts
const CLAIMED_STOPS: readonly ClaimedStop[] = [
  { id: "workshop", label: "Workshop", isRfp: false },
  { id: "budget", label: "Budget", isRfp: false },
  { id: "vote", label: "Board vote", isRfp: false },
  { id: "rfp", label: "RFP", isRfp: true },
];
```

Holdout is not a figure kind, not a field on `LessonsView`, and not a constant in this module. 15 and 7 do not appear.

### Signatures

```ts
/** Public surface. The only export. page.tsx already calls this. */
export function Lessons({ metrics }: { metrics: DossierMetrics }): React.ReactElement {
  throw new Error("not implemented");
}

/**
 * Single derive. Owns figure-kind policy, copy interpolation, and
 * the lesson table. Callers never pick a kind.
 *
 * Policy:
 *   events === 0              → figure.kind = "empty"
 *   events === clusters       → figure.kind = "chainGap"   // this run
 *   events > clusters         → figure.kind = "formedChain"
 */
function lessonsView(metrics: DossierMetrics): LessonsView {
  throw new Error("not implemented");
  // TODO: const figure = lessonsFigure(metrics)
  // TODO: return { copy: sectionCopy(metrics, figure), table: lessonTable(metrics, figure), figure }
}

function lessonsFigure(metrics: DossierMetrics): LessonsFigure {
  throw new Error("not implemented");
  // TODO: empty / chainGap / formedChain as above
  // TODO: isolates = Array.from({ length: clusters }, (_, i) => ({ index: i, matched: i < matches }))
  // TODO: claimedStops = CLAIMED_STOPS
}

function sectionCopy(metrics: DossierMetrics, figure: LessonsFigure): LessonsCopy {
  throw new Error("not implemented");
  // TODO: switch figure.kind; see Copy templates
}

function lessonTable(metrics: DossierMetrics, figure: LessonsFigure): LessonTable {
  throw new Error("not implemented");
  // TODO: four rows for chainGap / formedChain; three rows when empty (drop noWiderSample)
}

function LessonsFigureView({ figure }: { figure: LessonsFigure }): React.ReactElement {
  throw new Error("not implemented");
  // TODO: switch figure.kind; wrap markup in <figure className="viz" role="img" aria-label={figure.ariaLabel}>
}

function LessonRow({
  body,
  index,
  title,
}: {
  body: string;
  index: number;
  title: string;
}): React.ReactElement {
  throw new Error("not implemented");
  // existing MethodStep-shaped row; keep the grid
}
```

Validation lives at `loadDossier()`. Lessons trusts `DossierMetrics`. It does not re-parse JSON, does not read `cases`, and does not invent a multi-meeting count it cannot derive. `events === clusters` is the only defensible proof that every trajectory is a single meeting. `events - clusters` is extra linked events, not a count of multi-meeting trajectories; `formedChain` may say "at least one initiative was followed across meetings" and must not say "N chains formed."

The system deliberately does not: accept a `figureKind` prop, render the holdout cell grid, name districts in the schematic, use orange except on RFP marks, add a client island, or open a second closer.

### Interface depth

Public surface: one component, one `metrics` prop. Hidden behind it: the discriminant policy, the schematic claimed chain, copy that defines "trajectory" and "quote gate" in the same sentence that uses them, the decision to cut holdout, interpolation of every displayed number, and which CSS classes perform the gap. The page does not learn those rules. That is the depth this closer needs. A richer public type (`LessonsView` exported, or `figureKind` on the props) would make `page.tsx` assemble the closer and leak the claim into the composer.

Call chain to any pixel: `page.tsx` → `Lessons` → CSS. Two files of code, one of style.

### Module map

| File | Role | Client? |
| --- | --- | --- |
| `app/page.tsx` | Unchanged composer. Passes `dossier.metrics`. | Server |
| `components/results/lessons.tsx` | Owns `lessonsView`, figure markup, lesson rows, copy. | Server; wraps figure in existing `Reveal` |
| `components/results/reveal.tsx` | Unchanged. Sets `data-inview`. | Client, already the only island |
| `app/globals.css` | Final-frame chain-gap styles plus reveal keyframes. Reuse `stamp-in`, `line-draw`, `reveal-up`. Add only what those cannot do. | — |
| `lib/dossier.ts` | Unchanged. `DossierMetrics` is the input type. | Server |
| `data/DATASET.md` | Holdout 15+7 stays documented here. Not imported. | — |

Do not add `lib/lessons.ts`. Deriving the table in a second file is temporal decomposition: one module would "prepare" and another would "render" the same closer. Keep the knowledge in `lessons.tsx`.

Do not restyle Hero, Exhibit A, Method, Backtest, or Limitation. Method step 3 already says trajectories connect events about the same initiative across meetings. Define "quote gate" in lesson 2. No earlier-section wording pass is required.

### Layout

Reading order is the design.

1. Full thesis header on the left: kicker, title, lede. The lede restates the claim in plain speech and says how this run failed it. The visitor can stop here and still finish the demo.
2. Chain-gap figure on the right, inside `Reveal`. The figure performs the sentence the lede just said.
3. Below both columns, the list heading "What I'd do differently" and 3–4 numbered rows. The list is a consequence, not the section title.

On small screens: header, figure, list. The list never precedes the thesis.

This inverts the live closer, whose H2 is "What I'd do differently" and whose figure is a holdout census. Candidate B will not keep that H2 as the section title. The list heading is the only place that phrase remains.

### Figure spec

One figure. Kind `chainGap` on this run. CSS nodes and connectors, optional inline SVG for the claimed RFP ring so it matches `LeadRuler` (hollow circle, orange stroke, orange center dot). No new dependencies. No district names. No dates. No invented meetings.

**Row A — "What the claim needs"**

Four schematic stops from `CLAIMED_STOPS`, left to right: Workshop, Budget, Board vote, RFP. Nodes are hollow, dashed border, muted fill. Connectors between them are dashed and carry a gap hash (two short perpendicular ticks) in the middle. The hashes are the missing links. The last node is the only orange mark on this row: the RFP ring. This row is a picture of the thesis, not of this run.

**Row B — "What this run produced"**

`isolatedCount` solid green meeting nodes (`metrics.clusters`), equally spaced, no connectors between them. The absence of links is the observation. The first `matchedCount` nodes are `matched: true`: a short stub runs from that node to a small orange RFP pip. That stub is a find (one meeting later matched an RFP), not a chain. Unmatched nodes have no stub. Under the row, mono type: `{clusters} trajectories · {events} meetings · 0 links`.

The two rows together perform the gap: the claim is a polyline; the run is a scatter. A visitor does not need the word "trajectory" to see it. The aria-label still says it.

**`formedChain` (not this run)**

One linked pair (two green nodes, one solid connector) plus remaining isolates. Caption uses `events` and `clusters` only: "{events} events became {clusters} trajectories, so at least one initiative was followed across meetings." Do not invent how many chains formed.

**`empty`**

No nodes. A one-line figure title and caption. The list still hangs off the untested claim.

**Markup skeleton for `chainGap`**

```tsx
<figure className="viz" role="img" aria-label={figure.ariaLabel}>
  <span className="sr-only">{figure.ariaLabel}</span>
  <h3 className="figure-title">{figure.title}</h3>

  <div className="mt-6 space-y-10" aria-hidden="true">
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        What the claim needs
      </p>
      <ol className="chain-needed mt-3">
        {figure.claimedStops.map((stop, i) => (
          <li key={stop.id} className="contents">
            {i > 0 ? (
              <span className="chain-needed-link" style={{ "--i": i - 1 }}>
                <span className="chain-needed-hash" />
              </span>
            ) : null}
            <span
              className={stop.isRfp ? "chain-needed-stop chain-needed-stop--rfp" : "chain-needed-stop"}
              style={{ "--i": i }}
            >
              {stop.label}
            </span>
          </li>
        ))}
      </ol>
    </div>

    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        What this run produced
      </p>
      <ol className="chain-observed mt-3">
        {figure.isolates.map((node) => (
          <li key={node.index} className="chain-observed-item" style={{ "--i": node.index }}>
            <span className={node.matched ? "chain-observed-stop chain-observed-stop--matched" : "chain-observed-stop"} />
            {node.matched ? (
              <>
                <span className="chain-observed-stub" />
                <span className="chain-observed-rfp" />
              </>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
        {figure.isolatedCount} trajectories · {figure.isolatedCount} meetings · 0 links
      </p>
    </div>
  </div>

  <p className="mt-6 text-sm leading-6 text-muted-foreground">{figure.caption}</p>
</figure>
```

`.chain-needed` is a horizontal flex of nodes and links. `.chain-observed` is a horizontal flex of isolated items with generous gaps and no connecting element. The RFP pip uses the same visual language as `LeadRuler`: background fill, `#f4900a` stroke, orange center. Meeting nodes stay green. Do not orange the isolates.

### Animation contract

`Reveal` already writes `data-inview="true"` once on intersection (threshold 0.25) and never retracts it. Lessons does not add a client island and does not sequence animation in JavaScript.

**Base CSS is the final frame.** Dashed claimed connectors, gap hashes, isolated observed nodes, match stub, and orange RFP marks are all visible in the stylesheet with no animation required. That is what no-JS and reduced-motion show.

**Do not hide chain-gap internals when `data-inview="false"`.** The existing `[data-inview="false"] .rv { opacity: 0 }` rule is for Method stage labels, not this figure. Applying it here would make no-JS (SSR `data-inview="false"`) render an empty figure.

**On reveal** (`[data-inview="true"]`, scripting enabled, motion allowed):

| Clock | Element | Motion |
| --- | --- | --- |
| `i * 80ms` | `.chain-needed-stop` | reuse `stamp-in` 360ms |
| `200ms + i * 80ms` | `.chain-needed-link` | reuse `line-draw` 400ms, `transform-origin: left` |
| `450ms + i * 80ms` | `.chain-needed-hash` | reuse `stamp-in` 280ms |
| `700ms + i * 90ms` | `.chain-observed-item` | reuse `stamp-in` 320ms |
| `1100ms` | `.chain-observed-stub` | reuse `bar-grow` / `line-draw` 400ms |
| `1180ms` | `.chain-observed-rfp` | reuse `stamp-in` 320ms |

Use `animation-fill-mode: both`. Stagger with `--i` exactly as Limitation and Method do.

Connectors draw already dashed. They do not draw solid and then break. A solid-then-break sequence would make the no-JS final frame the unbroken claim, which is a lie.

**Reduced motion.** Existing rule already wins:

```css
@media (prefers-reduced-motion: reduce) {
  .viz *,
  .viz *::before,
  .viz *::after { animation: none !important; transition: none !important; }
}
```

No extra reduced-motion CSS is required if every animated node lives under `.viz`.

**No-JS.** `Reveal` is a client component. SSR emits `data-inview="false"`. Animations are gated on `true`, so they never run. The base stylesheet is the complete figure. The lede and the lesson list are server HTML and are complete without `Reveal`.

New CSS in `globals.css` is layout and final-frame chrome only: flex rows, dashed borders, gap-hash geometry, stub width, RFP pip. Prefer existing keyframes. Add a keyframe only if reuse would force a non-final base frame.

### Holdout decision

**Cut from this section.** Not the hero figure, not a caption, not a secondary note, not a footnote under the list.

The holdout cell grid answers a different question: how big is the locked sample once the prompt and thresholds freeze. That is protocol. This closer's question is whether the run followed one purchase across meetings. It did not. Putting 15+7 anywhere in the last section teaches the visitor that the next move is a bigger N. Candidate B's next move is depth in the districts already in hand, until a second meeting about the same initiative appears. Lesson 3 says that without using the word "holdout."

15 and 7 remain true in `DATASET.md`. Receipt already prints development denominators. Limitation already printed 1 of 5. Repeating the locked cell census here would steal the last word.

### Copy templates

Numbers in `{braces}` come from `DossierMetrics` via `formatCount` / existing formatters. Do not invent districts, scores, or a multi-meeting count.

**Kicker (all kinds):** `Lessons`

**List heading (all kinds):** `What I'd do differently`

#### `chainGap` — this run

Title:

> I never followed one purchase across meetings.

Lede:

> The demo said you can follow one government purchase across public meetings before the RFP — the formal request for proposals — goes out. A trajectory is that paper trail: events about the same initiative, linked from meeting to meeting. This run produced {formatCount(events)} events and {formatCount(clusters)} trajectories. Every trail is a single meeting. The chain the claim needs exists only in the test fixtures.

Figure title: `The missing chain`

Figure caption: `{clusters} trajectories from {events} meetings. None of the dotted links formed.`

Aria label: `This run produced {clusters} single-meeting trajectories. The thesis needs one initiative followed across meetings to an RFP. The connecting links are missing.`

Lesson 1 — `depth`

> Collect deeper in the districts I already have.

> {docs} documents went in; {formatCount(events)} events came out, each from a meeting of its own. Every purchase the run missed traces to paper that never entered the corpus, not to a wrong prediction. The next hours go to deeper collection per district: procurement archives, budget amendments, workshop attachments. The job is a second meeting about the same initiative, not a larger map.

Lesson 2 — `quoteGate`

> Keep the quote rule. Read the scans first.

> Requiring a character-for-character quote — the quote gate — is why every claim on this page can be checked in seconds. It is also why scanned PDFs and paraphrased minutes contributed nothing. Those are the pages that would have linked meetings. The gate stays. Optical character recognition belongs in front of it.

Lesson 3 — `noWiderSample`

> Do not add districts until a chain exists.

> A wider sample of still-thin districts would produce more single-meeting dots, not a chain. First follow one initiative across meetings on the paper already in reach. Then, and only then, grade a larger set.

Lesson 4 — `receiptNotEvidence`

> Treat the perfect scores as receipts.

> {precision.correct}/{precision.labeled} precision and {controls.fired} false alarms across {formatCount(controls.total)} control districts are the right shape, but they grade isolated meetings. {leadClause} The thesis is a chain. This run graded dots.

`leadClause` when `medianLeadDays !== null`: `A {medianLeadDays}-day lead from one meeting is a find, not a reconstruction of a purchase forming over time.`

`leadClause` when null: omit the sentence.

#### `formedChain` — future run only

Title: `A chain formed. The rest is still dots.`

Lede:

> The demo said you can follow one government purchase across public meetings before the RFP — the formal request for proposals — goes out. A trajectory is that paper trail. This run linked {events} events into {clusters} trajectories, so at least one initiative was followed across meetings. That is the first time the claim is exercised on real paper. The remaining trails are still single meetings.

Figure title: `A chain, and the leftovers`

Caption: `{events} events became {clusters} trajectories. At least one initiative was followed across meetings.`

Lessons 1, 2, and 4 stay. Lesson 3 retargets: collect until more than one chain exists; do not widen the sample on a single linked pair. Still no holdout census.

#### `empty`

Title: `The chain was never tested.`

Lede: same thesis sentence, then `This run produced no events, so no trajectory — and no chain — was built.`

Three lessons: depth, quote gate, receipts. Drop `noWiderSample`.

### What the visitor can repeat

After this section a cold reader should be able to say, without "holdout" or "denominator":

> They claimed you can follow one purchase across public meetings before the RFP. This run only found single meetings, so the next work is more paper per district until a chain appears.

That is the one-sentence finish. The figure is what makes it sayable.

## Synthesis decision

Not filled. This file is candidate B in architect's parallel exploration. Arena records the base and grafts after the other shapes land.

What this candidate refuses to absorb: a holdout cell grid as hero, caption, or footnote; an H2 of "What I'd do differently" with the thesis buried in lesson 3; a figure-kind prop on `page.tsx`; a second on-page figure; any design whose load-bearing visual is sample size rather than the missing meeting chain.

## Tradeoffs accepted

- We accept cutting the locked-holdout reminder from the closer in exchange for a last section that teaches the thesis instead of the protocol.
- We accept a schematic claimed chain (workshop / budget / vote / RFP) that is not this-run data in exchange for never inventing meetings, districts, or dates the dossier does not contain.
- We accept four lessons that all orbit one claim in exchange for not smuggling a second closer about N.
- We accept more CSS in `globals.css` in exchange for zero new dependencies and no new client island.
- We accept that `formedChain` cannot count multi-meeting trajectories from `DossierMetrics` in exchange for not extending the dossier for a variant this run cannot construct.
- We accept first-person titles ("I never followed…", "What I'd do differently") in exchange for a closer that sounds like a researcher owning the miss, not a dashboard reporting a metric.
- We accept breaking the live two-column "list left, census right" rhythm so the list hangs under the claim in exchange for thesis-first reading order.

## Alternatives considered

- **Keep the holdout grid as a caption or a second row under the chain-gap.** Rejected. The last word would still be 15+7. Callers would learn two figures' rules. The grid does not change what the reader understands about the thesis. Interface depth falls: the module now owns protocol census and chain policy.
- **Holdout as a secondary note under the list.** Rejected. A cold reader who does not know the word "holdout" should not meet it first in a footnote. Rubric 1 is a one-sentence finish about the claim, not about a locked sample.
- **Keep H2 as "What I'd do differently" and put the thesis in the lede only.** Rejected. The live closer already does a weaker version of this. The title is what a skimmer takes. Candidate B puts the miss in the title.
- **Replay Hillsborough (or the matched hit) as the claimed chain.** Rejected. The matched case is one meeting. Drawing it as workshop → budget → vote would fabricate the object the section says is missing. Information leakage: Lessons would need `hit`, and `page.tsx` would grow a second prop.
- **Export `figureKind` or `LessonsView` and let `page.tsx` choose.** Rejected. Shallow module. The composer would learn the discriminant. Rubric 5: figure policy lives inside `Lessons`.
- **A new client island that sequences the broken links in JS.** Rejected. `Reveal` plus CSS `both` fill already does enter-view motion. A second island violates the dossier constraint and makes no-JS a special case.
- **Three hardcoded JSX branches instead of a lesson table.** Rejected. That is the live closer. Counts would be re-derived beside the markup. The table is the organizing structure the implementation must name.
- **One-row figure of isolates only, no claimed spine.** Rejected. Isolates without a claimed chain show "small N," which is Limitation's job. The load-bearing visual is the gap between the polyline the thesis needs and the dots the run produced. Both rows are required.

## Open questions and risks

- If a future run has `events > clusters` but every multi-meeting trajectory is a control, should `formedChain` copy still say the claim was exercised? `DossierMetrics` cannot split that case. Do we leave the sentence as "at least one initiative" or do we later add a positive-side multi-event count to the dossier?
- The observed match stub uses orange because it marks an RFP moment. If that reads as "we reached the RFP with a chain," the stub should become a green tick and the caption should carry the find. Which reading wins in the first implementation pass?
- First-person H2 ("I never followed…") is sharper than Hero/Limitation. Is that voice allowed in the closer, or should the title be third-person ("This run never followed one purchase across meetings")?
- Lesson 3 tells the reader not to widen the sample yet. If the human's actual next calendar move is to open holdout anyway, the closer will argue with the plan. Which one should the section tell the truth about?

## Next implementation step

Delete the holdout cell grid and `HOLDOUT` constant from `components/results/lessons.tsx`, add `lessonsView` / `lessonsFigure` / `sectionCopy` / `lessonTable` in that file, and render the `chainGap` markup against the copy templates above before touching `globals.css`.

## Red-flag screen

- **Shallow module.** Fail if `page.tsx` grows a figure-kind prop or assembles rows. This sketch keeps one prop.
- **Information leakage.** Fail if holdout 15+7 or `CLAIMED_STOPS` labels appear in `page.tsx` or `dossier.ts`. Fail if Lessons imports `hit` to draw a fake chain.
- **Temporal decomposition.** Fail if a `lib/lessons.ts` "prepare" module appears beside a dumb renderer. The derive stays in `lessons.tsx`.
- **Pass-through.** `LessonsFigureView` switches on a discriminant it owns. It is not a pass-through of `metrics` into another file.

## Grounded facts this sketch refuses to decorate

Development run, from grounding and `DossierMetrics`: 124 documents, 4 events, 4 trajectories, 1 match, 317 days lead, 1 of 5 known purchases covered, 0 of 3 control districts fired, 1/1 hand-labeled precision. `events === clusters` is the chain-gap. `controls.multiEventClusters` is 0 and is not needed on the figure. Orange remains `#f4900a` and appears only on RFP marks. The multi-meeting chain is still a design.
