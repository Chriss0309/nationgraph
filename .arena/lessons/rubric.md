# Rubric: closing lessons section

1. **Cold reader finish.** A visitor who does not already know "trajectory", "holdout", or "quote gate" can finish the section and state in one sentence what the demo claimed and what this run taught.
2. **Thesis named.** The section says the claim in plain speech: follow one purchase across public meetings before the RFP. It then says how this run did or did not exercise that claim. Technical terms stay, defined in the same sentence.
3. **Figure earns its place.** Any animation or grid makes the claim or the next step visible. A decoration that does not change what the reader understands fails.
4. **Dossier consistency.** Same tokens, `Reveal`, light dossier feel, orange reserved, reduced-motion and no-JS complete. `page.tsx` still renders `<Lessons metrics={dossier.metrics} />`. Numbers trace to `DossierMetrics` or the documented 15+7 holdout.
5. **Deep module, small surface.** Copy interpolation and figure policy live inside `Lessons`. Callers do not assemble lesson rows or choose a figure kind.
6. **Surgical.** No new client islands, no new deps, no visual rewrite of earlier sections.
