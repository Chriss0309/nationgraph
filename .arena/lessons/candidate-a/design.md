# Candidate A — keep the numbered-row closer, make the copy teach

One-line concept: Lessons stays a Method twin — numbered rows on the left, one figure on the right — and wins by teaching. A typed four-row table is derived from `DossierMetrics`. The figure in the existing slot is no longer the holdout cell grid. It is a claim-versus-this-run schematic: follow one purchase across meetings, then show that this run produced only isolated meetings.

## Problem

The closer already mounts. `app/page.tsx` composes Hero → Exhibit A → Method → Backtest → Limitation → Lessons → Receipt and passes `metrics: DossierMetrics` into Lessons. The layout already matches Method: `LessonRow` is `MethodStep` with different props. The failure is not genre or placement. The failure is that a cold reader cannot finish the section and say what was being proved.

The live copy assumes the research protocol. "Quote gate", "denominators", "locked holdout", and "headline thesis" are insider names. The right-hand figure is a development-versus-holdout cell grid (`5+3` filled, `15+7` dashed) that stamps in on reveal. That grid is real protocol (`data/DATASET.md`) and it is the wrong picture. A visitor who just learned what an RFP is leaves knowing "the next run is bigger," not "follow one purchase across public meetings before the RFP, and this run never exercised that."

Constraints the sketch must honor: `page.tsx` stays a thin composer; Lessons keeps consuming only `metrics`; every on-page number traces to `DossierMetrics` or the documented holdout `15+7`; zero new deps; `Reveal` is the only client island; orange `#f4900a` only marks an RFP; light dossier tokens; CSS final-frame animation with `prefers-reduced-motion` and no-JS completeness; surgical wording on earlier sections only where a Lessons term must be named first. Do not invent a new section genre. Do not redesign Hero, Exhibit A, Method, Backtest, or Limitation visuals.

## Usage (caller's view)

The only public consumer is `app/page.tsx`. It does not assemble rows, choose a figure kind, or know the holdout constants.

```tsx
// app/page.tsx — unchanged call site
<Lessons metrics={dossier.metrics} />
```

Inside `lessons.tsx`, one function owns copy, lesson order, and figure policy. The component renders a decided view. It does not re-derive counts in JSX.

```tsx
// components/results/lessons.tsx — the section is a renderer of a decided view
export function Lessons({ metrics }: { metrics: DossierMetrics }) {
  const view = lessonsViewFromMetrics(metrics);
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="section-kicker">{view.kicker}</p>
            <h2 className="section-title">{view.title}</h2>
            <p className="section-lede">{view.lede}</p>
            <ol className="mt-10">
              {view.lessons.map((lesson) => (
                <LessonRow
                  key={lesson.index}
                  index={lesson.index}
                  title={lesson.title}
                  body={lesson.body}
                />
              ))}
            </ol>
          </div>
          <Reveal className="self-center">
            <ThesisFigure model={view.figure} label={view.figureLabel} />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {view.caption}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
```

Maintainer story: the pipeline re-runs and a second event links into an existing cluster. `metrics.events` no longer equals `metrics.clusters`. `lessonsViewFromMetrics` flips `figure.shape` from `all-singles` to `has-chains`, lesson 03 body and the this-run row label change, and no JSX is edited. A later holdout revision in `DATASET.md` is a one-constant change next to the copy that cites it. If someone tries `<Lessons figure="holdout" />` or `<Lessons lessons={[...]} />`, that API does not exist.

A second realistic call site does not exist and must not be invented. Tests import `lessonsViewFromMetrics` only if a colocated test wants the strings; `page.tsx` never does.

## Shape

**Data structures first.** One file-private view model, `LessonsView`, is the single source of truth for what the closer says and draws. It is derived by `lessonsViewFromMetrics(metrics: DossierMetrics): LessonsView`. `DossierMetrics` does not grow. Holdout `{ positives: 15, controls: 7 }` is a file-private const typed as `HoldoutSpec`, the only numeric source that is not a metric. The claim-row meeting labels are a file-private schematic tuple `CLAIM_CHAIN`, branded by `as const` so they cannot be confused with `metrics.clusters`.

`LessonTable` is a four-tuple, not an array. The closer is four lessons; a fifth row is a type error. Each `Lesson.body` is a finished string. Copy is data. The view does not return `ReactNode` fragments that re-branch on counts.

`ThesisShape` is a discriminated union derived from the one load-bearing predicate this closer owns: whether every surviving trajectory is a single meeting (`events === clusters`) or the run produced extra events that imply at least one chain (`events > clusters`). The figure model carries that shape plus `runMeetings: metrics.clusters` and `matchedMeetings: metrics.matches`. It does not carry district names, dates, or scores. Those would require `hit` or `cases`, which would thicken `page.tsx` and, on this run, would draw the Charlotte one-meeting hit as if it were the thesis.

**Figure decision.** Replace the holdout cell grid. Keep the slot.

The holdout grid answers "how big is the next sample?" Lesson 04 already answers that in prose, with the `15+7` counts and the freeze rule. The grid does not change what a cold reader understands about the claim. Rubric 3 fails: decoration that does not teach the thesis. Grounding already names this: the grid is real protocol and it does not show the thesis.

The load-bearing claim is: follow one purchase across public meetings before the RFP. The figure in the Method-matching slot must make that sentence visible, then show how this run did or did not exercise it. This development run produced four trajectories and four events. Every survivor is a single meeting. The multi-meeting chain exists only in hand-written fixtures. A two-row schematic can say that without inventing a district:

- Top row, "The claim": three meeting nodes linked, then an orange RFP node. Schematic. Caption says so.
- Bottom row, "This run": `clusters` isolated meeting nodes, no links. `matches` of them carry an orange RFP pip. On this run, four dots, one pip.

Orange is legal here because the figure marks an RFP. It is illegal on the holdout grid, which marks sample cells, not solicitations.

Do not pass `hit` in to "follow Charlotte." Charlotte is one meeting. Drawing it would make the one-meeting win look like the claim. Do not draw a fake Hillsborough chain. Do not keep the holdout grid as a second figure. One slot, one figure, the thesis.

**Flow.** `loadDossier()` already produced `DossierMetrics`. `Lessons` calls `lessonsViewFromMetrics`. `LessonRow` paints the Method-identical numbered row. `ThesisFigure` paints the decided schematic inside `Reveal`. CSS in `globals.css` does the motion. Call chain: `page.tsx` → `Lessons` → (`LessonRow` | `ThesisFigure`) → CSS. Two files of code, one of style.

**Invariants encoded in types.** Four lessons at the type level. `ThesisShape` makes the singles-versus-chains copy branch exhaustive. `HoldoutSpec` is the only non-metric count and is not a function argument, so callers cannot pass a different holdout. `CLAIM_CHAIN` is schematic and cannot accept a metric. `Lessons` public props stay `{ metrics: DossierMetrics }`. Figure kind is not a parameter. Validation of artifacts stays in `lib/dossier.ts`; Lessons trusts `DossierMetrics` and only derives display policy (per boundary-discipline).

**Interface depth.** Public surface: one component, one prop. Hidden behind it: the four-lesson policy, every interpolated sentence, the holdout constant, the claim-versus-run figure choice, a11y labels, and the animation class contract. That is the depth rubric 5 asks for. A `figureKind` option, an exported `lessonsFromMetrics` that `page.tsx` maps, or a `lib/lessons.ts` that only forwards strings would leak the policy and shrink the module.

**Deliberately not done.** No new client island. No new npm dependency. No `DossierMetrics` field for multi-event positives (the closer can derive `events === clusters`; it cannot honestly invent a topology). No holdout grid. No visual rewrite of earlier sections. No shared `LessonRow` extraction with Method — the markup is a rhyme, not a shared abstraction for one page (per laziness-protocol).

## Synthesis decision

*(Filled in by arena after candidate comparison. This document is candidate A only.)*

## Tradeoffs accepted

- We accept retiring a real protocol picture (the `15+7` cell grid) in exchange for a figure a cold reader can finish in one sentence. The holdout numbers stay, in lesson 04 and the caption, where they belong.
- We accept a schematic claim row (three unlabeled-as-district meetings, not a scored case) in exchange for not lying. The caption says the top row is the claim, not a result. Passing `hit` would be more "real" and more misleading.
- We accept a long lesson 04 in exchange for keeping thresholds and holdout out of the figure. The figure teaches the thesis. The last row teaches why the scores do not count yet.
- We accept defining technical terms again in Lessons even when Method already glossed them, in exchange for a section that stands if someone lands on it cold. The earlier wording pass only *names* the quote gate so the name is not new here.
- We accept leaving `.nextrun-cell` unused until implementation deletes it, rather than keeping the grid "because the CSS already exists."
- We accept first-person voice in Lessons only. Earlier sections stay as they are except for the named wording pass. A page-wide voice rewrite is a different job.

## Alternatives considered

- **Keep the holdout grid, rewrite copy only.** Smallest diff. The copy can teach, but rubric 3 still fails: the picture says "more squares later," not "follow one purchase across meetings." Interface looks the same and hides the wrong policy. Rejected.
- **Pass `hit` / `cases` and draw the featured trajectory.** Richer data, worse thesis. This run's hit is one meeting. The figure would celebrate a single-meeting match and hide the under-exercised claim. It also widens the public surface (`page.tsx` grows a second prop). Rejected.
- **Export `lessonsFromMetrics` and let `page.tsx` map rows.** Callers assemble the closer. Rubric 5 forbids it. The module becomes a string helper; policy leaks. Rejected (pass-through / shallow).
- **Split `lessons-copy.ts` and `lessons-figure.tsx`.** Temporal and visual decomposition of one decision: what this run taught. Two files would share `HOLDOUT` and the singles predicate. Rejected.
- **Two figures in the slot (thesis + holdout).** Crowds the Method-matching pane and invents a genre the assignment forbids. Rejected.
- **Five lessons, or a different left-column genre.** Would "win" on information and lose the Method rhyme. Out of shape for A.

## Open questions and risks

- Is three the right schematic length for the claim row, or is two (the minimum chain) clearer? Three reads as "across meetings"; two can look like a pair of dots.
- Should lesson 04 stay the home of link-threshold and match-floor definitions, or do those already live hard enough in Backtest and the receipt that 04 can stay shorter?
- When `events > clusters`, is a "+N more meetings" chip on the first this-run node honest enough, given we cannot know which trajectory grew without extending `DossierMetrics`?
- Delete `.nextrun-cell` in the same change as the figure, or wait until synthesis so unused CSS is not a merge conflict with B/C?

## Next implementation step

Write `lessonsViewFromMetrics` and the `LessonsView` / `LessonTable` / `ThesisShape` types in `components/results/lessons.tsx` with `not implemented` render bodies, then replace the four hardcoded `LessonRow` trees and the holdout grid with a map over the table plus `ThesisFigure`.

---

# Appendix A — type sketch and signatures

```ts
// components/results/lessons.tsx
// File-private types. The public surface is Lessons({ metrics }).
// DossierMetrics is imported, not extended. Holdout is not a metric.

import type { DossierMetrics } from "@/lib/dossier";

/** Documented in data/DATASET.md. The only non-metric count this file may display. */
const HOLDOUT = { positives: 15, controls: 7 } as const;
type HoldoutSpec = typeof HOLDOUT;

/** Schematic claim row. Not a scored district. Not metrics.clusters. */
const CLAIM_CHAIN = ["First mention", "Budget talk", "Board vote"] as const;
type ClaimChain = typeof CLAIM_CHAIN;

type LessonIndex = 1 | 2 | 3 | 4;

interface Lesson {
  readonly index: LessonIndex;
  readonly title: string;
  readonly body: string;
}

type LessonTable = readonly [Lesson, Lesson, Lesson, Lesson];

/**
 * The closer's load-bearing predicate: did every surviving trajectory
 * collapse to one meeting, or did extra events imply a chain?
 * events < clusters is artifact-invalid; treat as all-singles and do not
 * invent a topology.
 */
type ThesisShape =
  | {
      readonly kind: "all-singles";
      readonly runMeetings: number;
      readonly matchedMeetings: number;
    }
  | {
      readonly kind: "has-chains";
      readonly runMeetings: number;
      readonly matchedMeetings: number;
      readonly extraEvents: number;
    };

interface ThesisFigureModel {
  readonly shape: ThesisShape;
  readonly claim: ClaimChain;
}

interface LessonsView {
  readonly kicker: "Lessons";
  readonly title: string;
  readonly lede: string;
  readonly lessons: LessonTable;
  readonly figure: ThesisFigureModel;
  readonly figureLabel: string;
  readonly caption: string;
}

function thesisShape(metrics: DossierMetrics): ThesisShape {
  const runMeetings = metrics.clusters;
  const matchedMeetings = Math.min(metrics.matches, metrics.clusters);
  if (metrics.events > metrics.clusters) {
    return {
      kind: "has-chains",
      extraEvents: metrics.events - metrics.clusters,
      matchedMeetings,
      runMeetings,
    };
  }
  return { kind: "all-singles", matchedMeetings, runMeetings };
}

/** Owns copy interpolation, lesson order, holdout citation, and figure policy. */
export function lessonsViewFromMetrics(metrics: DossierMetrics): LessonsView {
  throw new Error("not implemented");
}

function LessonRow(_props: {
  index: LessonIndex;
  title: string;
  body: string;
}): React.ReactElement {
  throw new Error("not implemented");
  // Markup must remain the Method rhyme:
  // <li className="grid grid-cols-[2rem_1fr] gap-4 border-t border-border py-5">
  //   <span className="font-mono text-xs text-muted-foreground">{pad(index)}</span>
  //   <div>
  //     <h3 className="font-heading text-lg font-semibold tracking-[-0.02em]">{title}</h3>
  //     <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
  //   </div>
  // </li>
}

function ThesisFigure(_props: {
  model: ThesisFigureModel;
  label: string;
}): React.ReactElement {
  throw new Error("not implemented");
}

export function Lessons(_props: { metrics: DossierMetrics }): React.ReactElement {
  throw new Error("not implemented");
}
```

`LessonRow` keeps Method's numbered-row classes exactly. Do not extract a shared `NumberedRow`. Do not accept `ReactNode` for `body`; interpolation happens in `lessonsViewFromMetrics`.

`lessonsViewFromMetrics` is exportable for a colocated test. It is not imported by `page.tsx`.

---

# Appendix B — module map

| Module | Owns | Does not own |
| --- | --- | --- |
| `app/page.tsx` | Thin compose. `<Lessons metrics={dossier.metrics} />`. | Lesson text, figure kind, holdout constants. |
| `lib/dossier.ts` | `DossierMetrics`. Artifact validation. | Lesson policy. Holdout `15+7`. Figure choice. |
| `components/results/lessons.tsx` | View model, four-row table, thesis figure, holdout const, `LessonRow`, `ThesisFigure`. | `hit`, `cases`, Method visuals, new client islands. |
| `app/globals.css` | `.thesis-node`, `.thesis-link`, `.thesis-rfp`, `.thesis-gap`, row-label delays. Delete `.nextrun-cell` once the grid is gone. | New keyframes unless reuse fails. Prefer `stamp-in`, `line-draw`, `reveal-up`. |
| `data/DATASET.md` | Canonical `15+7`. Freeze rule. | Display. Lessons copies the two integers; it does not import markdown. |
| `components/results/method.tsx` | Extract wording pass: name "quote gate". | Lessons layout. |
| `components/results/exhibit-card.tsx` | Gate-caption wording pass: name "quote gate". | Visual change. |
| `components/results/limitation.tsx` | One-clause definition of "corpus". | Visual change. Voice change. |
| `components/results/reveal.tsx` | Unchanged. | — |

No `lib/lessons.ts`. No `components/results/thesis-figure.tsx`. No shared row primitive with Method.

---

# Appendix C — exact copy

Voice: first person. Every technical term is defined in the same sentence that uses it. Numbers below show the current development run; implementation interpolates from `DossierMetrics` and `HOLDOUT`.

### Frame

- Kicker: `Lessons`
- Title: `What I'd do differently.`
- Lede:

> This demo claimed I could follow one purchase across public meetings before the RFP — the formal request for proposals. This run taught me I barely collected enough paper to try. Four lessons, and the next run they shape.

### 01 — paper

- Title: `Paper was the bottleneck, not the model.`
- Body template:

> `{docs}` documents went in; `{formatCount(events)}` dated purchase mentions I was allowed to keep came out. Every known purchase I missed traces to meeting paper that never entered the corpus, the set of documents I actually collected, not to a wrong prediction. The next hours go to deeper collection per district: procurement archives, budget amendments, workshop attachments.

- Current run: `124 documents went in; four dated purchase mentions I was allowed to keep came out. …`

### 02 — quote gate

- Title: `The quote gate cut both ways.`
- Body (no metric interpolation):

> The quote gate is the rule that an event exists only when the source contains a character-for-character sentence I can point to. That is why every claim above can be checked in seconds. It is also why scanned PDFs and paraphrased minutes contributed nothing. The gate stays; OCR — software that turns a scanned page into searchable text — belongs in front of it.

Do not say "fixtures." Do not say "headline thesis."

### 03 — thesis

- Title: `I still have not exercised the claim.`
- Body when `shape.kind === "all-singles"`:

> A trajectory is the paper trail of one purchase forming across meetings. Following one initiative from first mention to the RFP is the point of the pipeline, yet every surviving trajectory in this run is a single meeting. The multi-meeting chain I designed exists only in examples I wrote by hand. More paper per district turns that from a design into a result.

- Body when `shape.kind === "has-chains"`:

> A trajectory is the paper trail of one purchase forming across meetings. Following one initiative from first mention to the RFP is the point of the pipeline. This run produced `{formatCount(clusters)}` trajectories from `{formatCount(events)}` events — a start, not enough to call the claim tested. I still need more paper per district before I can say the chain holds in the wild.

Current run uses the `all-singles` body.

### 04 — denominators

- Title: `Perfect scores on tiny denominators prove little.`
- Body template:

> A denominator is the count I divide by. `{precision.correct}/{precision.labeled}` hand-checked precision and `{controls.fired}` false alarms across `{formatCount(controls.total)}` control districts — districts I searched that had no known cybersecurity purchase in the window — are the right shape, but at this size they are implementation receipts, not performance evidence. The next run uses a locked holdout: `{HOLDOUT.positives}` reserved purchases and `{HOLDOUT.controls}` reserved control districts I do not open until the prompt, the `{formatSimilarity(linkThreshold)}` link threshold (how similar two events must be to count as the same purchase), and the `{formatSimilarity(matchFloor)}` match floor (how similar a trajectory must be to the later RFP) are frozen.

- Current run: `A denominator is the count I divide by. 1/1 hand-checked precision and 0 false alarms across three control districts — districts I searched that had no known cybersecurity purchase in the window — are the right shape, but at this size they are implementation receipts, not performance evidence. The next run uses a locked holdout: 15 reserved purchases and 7 reserved control districts I do not open until the prompt, the 0.78 link threshold (how similar two events must be to count as the same purchase), and the 0.50 match floor (how similar a trajectory must be to the later RFP) are frozen.`

### Figure chrome

- Figure title (`figure-title`): `Follow one purchase across meetings.`
- Top row label: `The claim · several meetings, then the RFP`
- Bottom row label, `all-singles`: `This run · {clusters} trajectories, each one meeting`
- Bottom row label, `has-chains`: `This run · {clusters} trajectories, {extraEvents} extra meeting{s} on the chain`
- `aria-label` / `sr-only` (`all-singles`):

> The claim is a chain of meetings leading to an RFP, the formal request for proposals. This run produced `{clusters}` trajectories, each a single meeting. `{formatCount(matches, true)}` later matched a real RFP.

- Caption:

> The top row is the claim, not a scored district. `{formatCount(clusters, true)}` trajectories survived this run; `{all-singles ? "each is one meeting." : "the chain is still thinner than the design."}` `{formatCount(matches, true)}` of them later matched a real RFP. Development numbers debug the pipeline; only the untouched holdout counts as evidence.

- Current caption: `The top row is the claim, not a scored district. Four trajectories survived this run; each is one meeting. One of them later matched a real RFP. Development numbers debug the pipeline; only the untouched holdout counts as evidence.`

- Legend (mono, `text-[10px]`, under the rows):
  - green square + `a public meeting`
  - orange pip + `the RFP`
  - hairline + `same purchase, next meeting`
  - empty gap + `a one-meeting trail`

Drop "fixtures", "headline thesis", "denominators" as a title-only insider, and "locked holdout" without a definition. All three either disappear or are defined in-sentence as above.

---

# Appendix D — figure spec (same slot, new picture)

### Slot (unchanged)

- Parent grid: `grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20`
- Figure wrapped in `<Reveal className="self-center">`
- `<figure className="viz" role="img" aria-label={figureLabel}>`
- Inner `<span className="sr-only">{figureLabel}</span>`
- Title uses `figure-title`
- Caption sits outside the figure, `mt-4 text-sm leading-6 text-muted-foreground`
- Decorative guts `aria-hidden="true"`

### What it shows

Two stacked rows. Not a cell grid. Not a scored district.

**Row 1 — the claim.** Horizontal flex: node `First mention` → link → node `Budget talk` → link → node `Board vote` → link → orange RFP node labeled `RFP`. Three meetings from `CLAIM_CHAIN`. The RFP node is the only orange on the section.

**Row 2 — this run.** Horizontal flex of `runMeetings` isolated nodes, `gap-6` or larger, **no** `.thesis-link` between them. That absence is the result. The first `matchedMeetings` nodes get a small orange pip (schematic: we do not know which isolate matched; the caption already said the top row is not a scored district, and the pip count equals `metrics.matches`). On `has-chains`, the first node grows a mono chip `+{extraEvents}` rather than a guessed second meeting attached to a guessed district.

If `runMeetings === 0`, row 2 is one muted sentence, `No trajectories survived this run.`, and no nodes.

### CSS classes and tokens

| Class | Role | Visual |
| --- | --- | --- |
| `thesis-row` | One horizontal chain or isolate row | `mt-5 flex items-center`, first row `mt-5`, second `mt-8` |
| `thesis-row-label` | Mono row caption | existing `font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground`; add `rv` + `--i` |
| `thesis-node` | Meeting | `size-8 shrink-0 border border-ng-green-300 bg-ng-green-100 sm:size-9` plus a mono label under the box |
| `thesis-link` | Claim-row connector | `h-px flex-1 origin-left bg-ng-green-300`, reuse `line-draw` |
| `thesis-rfp` | RFP node | `size-8 shrink-0 border border-ng-orange bg-ng-orange sm:size-9` — `#f4900a`. Allowed because it marks an RFP. |
| `thesis-pip` | Small RFP tick on a this-run isolate | `absolute -right-1 -top-1 size-2.5 rounded-full bg-ng-orange` |
| `thesis-gap` | Spacer between isolates | no hairline, wider gap than the claim row |
| `thesis-extra` | `has-chains` chip | `font-mono text-[9px] text-muted-foreground` |

Do not use `nextrun-cell`. Do not use orange on meeting nodes. Do not use green on the RFP.

### Animation

Base CSS is the final frame: nodes opaque and at `scale(1)`, links at `scaleX(1)`, RFP and pips visible. Every keyframe travels *to* that frame with `both` fill.

Reuse existing keyframes. Do not add a new named animation unless reuse is visually wrong.

```css
[data-inview="true"] .thesis-node {
  animation: stamp-in 300ms ease-out calc(var(--i) * 90ms) both;
}

[data-inview="true"] .thesis-link {
  animation: line-draw 400ms ease-out calc(180ms + var(--i) * 90ms) both;
}

[data-inview="true"] .thesis-rfp {
  animation: stamp-in 400ms cubic-bezier(0.22, 1, 0.36, 1)
    calc(520ms + var(--i) * 90ms) both;
}

[data-inview="true"] .thesis-pip {
  animation: stamp-in 300ms ease-out calc(720ms + var(--i) * 60ms) both;
}

[data-inview="true"] .thesis-row-label.rv {
  /* existing .rv reveal-up already keys off --i */
}
```

`--i` assignment:

- Claim nodes: `0, 1, 2`
- Claim links: `0, 1, 2`
- Claim RFP: `--i: 3`
- This-run nodes: `--i: 4 + index` so they stamp after the claim row finishes
- This-run pips: same index as their node

Choreography a cold reader can follow: the claim draws left to right and lands on orange; then this run appears as four unlinked dots, one of them tagged with orange. The missing links are the lesson.

### Reduced motion and no-JS

Existing invariants stay global. Do not add a second policy.

```css
@media (prefers-reduced-motion: reduce) {
  .viz *,
  .viz *::before,
  .viz *::after { animation: none !important; transition: none !important; }
}
```

`Reveal` already gates pre-entry hiding behind `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`. No-JS and reduced-motion both show the finished two-row figure.

### Why this figure, not the grid

A cold reader finishing the section should be able to say: *they wanted to follow one purchase across meetings before the RFP; this run only found single meetings; the next run is a locked holdout they have not opened.* The two-row schematic carries the first two clauses. Lesson 04 and the caption carry the third. The cell grid carried only the third, and it used a visual language (positive vs control cells) that Method and Limitation already spent on a different job (attrition, coverage). Repeating cells here does not teach the new sentence.

---

# Appendix E — wording pass on earlier sections

Visuals unchanged. Strings only. Only terms Lessons will use as names.

### Method, step 2 Extract

From:

> A model pulls purchase events. No verbatim quote in the source — no event. District, date, and URL come from the source ledger, never from the model.

To:

> A model pulls purchase events. The quote gate: no character-for-character sentence in the source, no event. District, date, and URL come from the source ledger, never from the model.

Reason: Lessons spends a whole row on the name. Method already taught the rule. Name it when the rule first appears.

### Exhibit A, gate caption

From:

> Extraction rule: every event must quote its source character-for-character, or it is dropped.

To:

> Quote gate: every event must quote its source character-for-character, or it is dropped.

Reason: the reader has just seen the verbatim line. Same name, same rule, still no visual change.

### Limitation, corpus clause

From:

> The pipeline surfaced {one} — the one whose paper trail entered the corpus. The other {four} trails never made it in;

To:

> The pipeline surfaced {one} — the one whose paper trail entered the corpus, the documents actually collected. The other {four} trails never made it in;

Reason: Lessons uses "corpus" as a defined term. Limitation already used the word undefined. Keep third person; do not restyle the coverage strip.

### Do not touch

- Hero: RFP is already defined in-sentence.
- Method step 3: trajectory is already defined as "the paper trail of one purchase forming over time."
- Method step 4 / Backtest: match floor is already on the ledger.
- Receipt: threshold line stays as-is.
- Do not introduce "holdout" or "denominator" before Lessons. Those are this section's words.
- Do not rename Method's "Link" step or change the funnel figure.

---

# Appendix F — red-flag screen

- **Shallow module.** Rejected shape would export row builders and a figure enum. Chosen shape hides interpolation, holdout, and figure policy behind `Lessons({ metrics })`.
- **Information leakage.** Holdout integers live in one const beside the copy that cites them. `DossierMetrics` is not re-shaped to smuggle `15+7`. Quote-gate is a pedagogical name, not a second protocol owner.
- **Temporal decomposition.** One view-model function, not load / validate / format / render modules.
- **Pass-through.** `LessonRow` is presentational markup, same as `MethodStep`. It does not forward the same arguments to another module. `ThesisFigure` consumes a decided model, not raw metrics plus a kind flag.

---

# Appendix G — interpolation ledger

| Token | Source |
| --- | --- |
| `docs`, `events`, `clusters`, `matches` | `DossierMetrics` |
| `precision.correct`, `precision.labeled` | `DossierMetrics.precision` |
| `controls.fired`, `controls.total` | `DossierMetrics.controls` |
| `linkThreshold`, `matchFloor` | `DossierMetrics` via `formatSimilarity` |
| `15`, `7` | `HOLDOUT` from `data/DATASET.md` |
| `CLAIM_CHAIN` labels | schematic const, never a metric |
| District names, dates, scores, lead days | not displayed in Lessons |

`formatCount` / `formatSimilarity` stay imported from `@/lib/dossier`. No new formatters.
