# Synthesis: base = Candidate A ("Exhibit A" evidence dossier)

Orchestrator and cross-judge independently scored A first (judge: A 34, C 33, B 30). Agreement confirms the pick. A wins on the hero (measured number inside the brand slogan, self-drawing ruler), the similarity ledger (the only candidate that visualizes the 0.50 floor and the visible "no" on charlotte-1), the `Verdict` discriminated union, graceful degradation (`hit: null` renders instead of failing the build), and the number-traceability ledger.

Implement Candidate A (`.arena/candidate-a/design.md`) as specified, with the following grafts and overrides. Where this file and candidate A disagree, THIS FILE WINS.

## Grafts from B

1. **Rewind choreography on the hero ruler (V1).** Reveal the ORANGE RFP endpoint (right) first, then draw the ruler line RIGHT-TO-LEFT back to the green board-packet endpoint, ticks accumulating along the way; the green endpoint and the `317 days` numeral land last. The motion performs "look upstream." Keep A's keyframe/technique inventory and A's trigger strategy (load-triggered in hero, `Reveal` island below the fold). Do NOT use B's `animation-timeline: view()` triggers; they are static in Firefox/Safari.
2. **Native `<details>`/`<summary>` for the case dossier rows** in S4, replacing the @base-ui Accordion. `<details name="cases">` gives one-open-at-a-time; the matched charlotte-0 row ships with the `open` attribute. Full local source paths render as selectable mono text (B's ledger row treatment). This removes the unacknowledged second client island; `Reveal` stays the ONLY client component.

## Grafts from C

3. **Compact quote sweep in the hero.** Directly under the ruler caption, one mono line: the charlotte-0 verbatim evidence with the animated `#d9f2e5` highlighter sweep over `Firewall Software` and `$179,820` (C's V2 technique, A's S2 keeps the full annotated facsimile; the same string appearing in both is intended). HEIGHT BUDGET: the hero (topbar excluded) must fit a 1366x768 viewport without scrolling. If it cannot after tightening spacing, drop this hero quote line (S2 already carries it) rather than shrinking the H1.
4. **Suppress unmatched lead-days everywhere.** charlotte-1's card copy is `Below match floor · similarity 0.41 against the same RFP` — no "254 days". miami-dade-0: `Below match floor · similarity 0.34 against a later cybersecurity RFP` — no "296". This overrides A's S4 card copy and resolves A's open question. The `Verdict.belowFloor` variant should NOT carry `leadDaysIfMatched`; delete the field so the mistake is unrepresentable.
5. **"Extract is not a firing" framing for citrus-0.** Card copy: `Control district — it never bought. One extracted event, no multi-meeting trail, no alarm.` V4's caption keeps A's wording. This preserves the honest nuance that a control district produced an extract yet still counts as quiet (firing = a multi-event cluster; `n_multi_event_clusters: 0`).

## Rejections (recorded per arena Phase E)

- **B's ordinal cutoff rail in the hero: rejected.** Redundant once the ruler itself rewinds (graft 1 carries the "vendor enters too late" semantics) and it puts the 1366x768 hero budget at risk. The lede's first sentence states the problem in prose.
- **B's build hard-fail when matched-case count != 1: rejected.** Keep A's `hit: CaseStudy | null` with featured = max leadDays among matched. Build failure is reserved for true cross-artifact contradiction (C's checks, below).
- **C's orange hit tick in the attrition/funnel viz: rejected.** Orange is reserved for RFP moments only; A's `cell-keep` green-bright `#40bf7c` survivor cells stand.
- **B's `view()`-only trigger strategy: rejected** (static in non-Chromium). A's `Reveal` + load-triggered hero wins.

## Additional implementer directives (judge risks + resolved open questions)

- **Loader validation (from C):** `loadDossier()` throws at build time on cross-artifact contradiction: timelines/comparison key sets differ, flattened event count != `metrics.n_events`, cluster count != `metrics.n_clusters`, matched count != `metrics.coverage.covered`. A re-run that adds trajectories or hits must extend the page, never break it.
- **`Geist` is confirmed exported** from `next/font/google` in this repo (verified against `node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts`). Load `Geist` + `Geist_Mono` only; headings use the CSS stack `"Helvetica Neue", Arial, sans-serif` via a token, no webfont. Remove Bricolage_Grotesque, Instrument_Sans, Newsreader.
- **Token remap must preserve the shadcn contract.** Keep every existing CSS variable name in `globals.css` defined (components/ui consume `--primary`, `--border`, `--muted`, `--muted-foreground`, `--secondary`, `--accent`, `--card`, `--ring`, radii); change VALUES to the NationGraph hexes from `.arena/grounding.md`. Add the `--color-ng-green-*` ramp + tints + `--color-ng-orange` in `@theme`. Retire the orange-leaning `--chart-*` values (remap to the green ramp). Delete the `.dark` block; the page is light-only and the class is never applied (unowned surface). Set `--radius: 0.5rem`.
- **Threshold labels:** `metrics.threshold` (0.78) is the LINK threshold; label it `link threshold`. `metrics.match_threshold` (0.50) is the `match floor`. Never "extraction floor" (B's mislabel).
- **Evidence overflow:** verbatim evidence strings (Miami-Dade's is ~300 all-caps chars) get `overflow-wrap: anywhere` and preserved case. Render evidence character-for-character; no editorial quotation marks around the facsimile line.
- **Vendor names and dollar amounts stay** ($179,820 Sinnott Wolach; $78,499 UDT/Lightspeed; $227,000 Securly): they are the evidence, drawn from official public documents.
- **Reduced motion:** A's invariant holds everywhere: base CSS is the final frame, `both` fill, `prefers-reduced-motion: reduce` => `animation: none` on the viz layer, no-JS shows the complete page (scripting-gated pre-entry hiding).
- **metadata:** title `NationGraph — Know before the RFP drops`; description interpolates `median_lead_days` from the loader.
