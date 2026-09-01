# Grounding: closing lessons section

The results page is a one-screen thesis demo. `app/page.tsx` loads `Dossier` once and composes sections in a fixed order: Hero, Exhibit A, Method, Backtest (or empty), Limitation, Lessons, Receipt.

The original arena synthesis ended the story at Limitation. `components/results/lessons.tsx` was added later as a sixth beat. It already mounts. The job is not a second closer. The job is to make that closer teach a cold reader what the demo claimed, what the run taught, and what comes next.

## What the page already argues

Vendors learn about a government purchase when the RFP goes public. The intent was already sitting in ordinary school-board documents. This prototype reads that paper, keeps only events that quote the source character for character, links events about the same initiative into trajectories, and grades those trajectories against later real solicitations the pipeline never saw.

This development run: 124 documents, 4 events, 4 trajectories, 1 match, 317 days lead, 1 of 5 known purchases covered, 0 of 3 control districts fired, 1/1 hand-labeled precision. All four surviving trajectories are single meetings. The multi-meeting chain that is the headline claim appears only in fixtures.

## Cold-reader gap

The current Lessons copy assumes the reader already lives in the research protocol. "Quote gate", "denominators", "locked holdout", and "headline thesis" are insider words. The holdout cell grid is real protocol (`data/DATASET.md`: development 5+3, locked holdout 15+7) but it does not show the thesis. A visitor who just learned what an RFP is cannot leave knowing what was being proved.

## Constraints the design must honor

- Zero new npm dependencies. CSS and existing `Reveal` only.
- `Reveal` stays the only client island.
- Orange `#f4900a` is reserved for RFP moments. Do not use it in Lessons unless the figure marks an RFP.
- Light-only. Section tokens: `section-kicker`, `section-title`, `section-lede`, `figure-title`, `viz`.
- Animation: base CSS is the final frame, `both` fill, `prefers-reduced-motion: reduce` disables viz motion, no-JS shows the complete page.
- Every displayed number traces to `DossierMetrics` from `loadDossier()`. Holdout counts 15 and 7 come from `data/DATASET.md` only. Do not invent districts or scores.
- `page.tsx` stays a thin composer. `Lessons` keeps consuming `metrics: DossierMetrics`.
- Surgical. Do not redesign Hero, Exhibit A, Method, Backtest, or Limitation visuals. A light wording pass on those sections is allowed only where a term a cold reader hits in Lessons must be introduced earlier.
- PLAN.md still wants one screen, no extra frameworks, small-and-verified, not fake scale.

## Existing Lessons shape to beat

Numbered rows (same grid as Method's `MethodStep`) plus a development-vs-holdout cell grid that stamps in on reveal. Four lessons: paper bottleneck, quote gate cuts both ways, thesis under-exercised, tiny denominators prove little.

## Organizing structure the implementation must name

A table of lessons derived from `DossierMetrics`, not four hardcoded JSX branches that each re-derive the same counts. One figure whose kind is chosen because it carries the load-bearing claim, not because it looks busy.

## Consumer

The visitor has no prior context. They opened a demo. Every sentence must tell them what to know or what to do. Technical words stay, and the same sentence defines them.
