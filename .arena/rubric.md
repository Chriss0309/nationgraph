# Rubric: results-page redesign candidates

Score each candidate 1-5 per criterion, with one sentence of justification each.

1. **10-second thesis.** A first-time visitor understands "buying intent is visible in public documents months before the RFP, and this prototype proved 317 days on a real purchase" within the hero viewport, before scrolling.
2. **Complete story arc.** Problem (RFP = too late) -> thesis -> method (124 docs, verbatim-quote gate, linking, backtest with controls) -> result (317d, 0/3 controls, 1/1 precision) -> honest limitation (1/5 coverage, data not model). All five present, in an order that flows; the limitation is framed as credibility, not buried.
3. **Data-driven honesty.** Every number is sourced from `out/metrics.json` / `timelines.json` / `comparison.json` imports; no hardcoded stats that would go stale when the pipeline re-runs; the design does not fake scale from 4 events.
4. **Visualization quality.** At least 3 distinct animated visualizations, each specified concretely (data fields + animation technique) and each understandable in ~5 seconds without reading a manual. Motion explains the data (lead time, funnel/attrition, coverage, density) rather than decorating.
5. **Brand fidelity + copy minimalism.** Matches the extracted NationGraph tokens (Helvetica Neue headings, Geist body, green scale on light neutrals, thin borders); titles/captions are short, plain, confident; no purple-gradient AI-slop aesthetics.
6. **Feasibility under constraints.** Zero new deps, Tailwind v4 literal classes, server-first with each client component justified, `prefers-reduced-motion` handled, honest about Next 16 specifics. The module map is small and buildable in one pass.
7. **Interface depth of the design system.** The typed domain model (e.g. CaseStudy join) and registries centralize knowledge; sections read from data, not scattered constants; a maintainer could add a fifth trajectory without touching layout code.

Recommend one candidate as the base, name what you would graft from each loser, and flag anything that violates the grounding facts (especially any number not present in the JSON artifacts).
