# Grounding: redesign of the NationGraph prototype results page

## What this project is

A research prototype answering one question: can a school district's cybersecurity purchase be spotted in ordinary public board documents months before the official solicitation (RFP) drops? Vendors normally learn about government purchases when the RFP is published, which is too late; by then requirements are written and incumbents are entrenched.

How the prototype works (Python pipeline, `trajectory.py`):

1. Pulled 124 official documents (board agendas, minutes, budgets, procurement archives) from 8 Florida school districts. 5 districts made a known cybersecurity purchase in 2022 (positives), 3 never did (controls).
2. An LLM extracts purchase-related events from each document. Hard factuality gate: every event must carry a verbatim quote (max 300 chars) that occurs character-for-character in the source document, or it is dropped. District, date, and URL are stamped from the input CSV, never trusted from the model.
3. Events about the same initiative are linked across meetings (embedding cosine + category/vendor bonuses, greedy chronological clustering per district) into "trajectories."
4. Backtest: trajectories are compared against the real 2022 solicitations. Leakage rule: every source document strictly pre-dates its outcome.

## The result (the story the page must tell)

- One signal survived hand review: Charlotte County Public Schools' board approved an RFP request for firewall software on 2021-03-09; the district's E-rate firewall solicitation dropped 2022-01-20. The pipeline flagged it **317 days early**.
- **Zero false alarms** in the 3 control districts that never bought (0/3 control false-positive rate).
- Hand-labeled precision 1/1.
- Honest limitation: coverage was **1 of 5** known purchases. At ~1 document per district-month, most buying trails are invisible in the sample. The fix is more documents per district, not a smarter model. This limitation must be presented honestly on the page; it is part of the credibility.

## Data artifacts the page renders (single source of truth)

All numbers on the page MUST come from these committed JSON/CSV files imported at build time. `README.md` prose contains STALE numbers (882 days, 1/2 coverage); never copy numbers from prose.

`out/metrics.json` (exact current contents):

```json
{
  "n_docs": 124, "n_events": 4, "n_clusters": 4,
  "coverage": { "covered": 1, "total": 5, "rate": 0.2 },
  "median_lead_days": 317,
  "control_fp": { "firing_districts": 0, "control_districts": 3, "rate": 0.0, "n_multi_event_clusters": 0 },
  "precision": { "correct": 1, "labeled": 1, "rate": 1.0 },
  "threshold": 0.78, "match_threshold": 0.5
}
```

`out/timelines.json`: 4 trajectories keyed by cluster id, each `{ district, initiative_name, category, first_date, last_date, events[] }`; event = `{ date, state, action, vendor, amount, summary, evidence (verbatim quote), url, source_type }`. Current cases:

1. `charlotte-county-public-schools-0` — Firewall Software, SOLICITATION event 2021-03-09, vendor Sinnott Wolach Technology, $179,820. THE HIT.
2. `charlotte-county-public-schools-1` — URL/Web Content Filtering, SOLICITATION 2021-05-11, $78,499. Similarity 0.4075, below 0.5 floor, not matched.
3. `citrus-county-school-district-0` — Securly Web Filtering, AUTHORIZATION 2020-12-08, $227,000. No outcome in ledger, not matched.
4. `miami-dade-county-public-schools-0` — Cyber Liability Insurance Renewal, RENEWAL 2021-06-23. Similarity 0.3392, not matched.

`out/comparison.json`: per cluster id `{ matched, similarity, outcome_title, outcome_type, outcome_date, outcome_url, lead_days }`. Only charlotte-0 is `matched: true` (similarity 0.5959, outcome "Firewall Services, per FCC USAC's E-rate Program", 2022-01-20, lead 317).

Event states enum: DISCUSSION, WORKSHOP, BUDGET, AUTHORIZATION, SOLICITATION, AWARD, RENEWAL, OTHER.

## Current page (baseline to redesign)

`app/page.tsx` (server component, ~660 lines): hero ("The RFP is the last signal, not the first."), 4 stat tiles, a static SVG dot-timeline of the 4 trajectories, then an accordion evidence list per case, footer receipt line. `app/layout.tsx` loads Bricolage Grotesque (display), Instrument Sans (body), Newsreader (serif quotes), Geist Mono. `app/globals.css` has a green-tinted shadcn token set. Components available under `components/ui/`: accordion, badge, button, card, empty, item, separator (shadcn on @base-ui/react).

What the baseline fails at: the problem/thesis is not spelled out (no "vendors find out at RFP = too late" framing), the method (124 docs -> verbatim-quoted events -> linked trajectories -> backtest with controls) is invisible, the honest limitation is absent, and there is almost no motion or data visualization beyond one static dot strip.

## Brand: match www.nationgraph.com (extracted from its live Webflow CSS)

- Headings: `"Helvetica Neue", Arial, sans-serif` (system stack, no webfont needed).
- Body: `"Geist Variable"` -> use `Geist` from `next/font/google`. Mono: Geist Mono (already loaded).
- Green scale (primary brand): tints `#f7fdfa #ecf9f2 #d9f2e5 #c6ecd8`; brights `#40bf7c` (green-100) `#39ac70` `#339963`; core `#2d8657` (their most-used accent) `#26734a` `#20603e` `#194d32` `#133925` `#0d2619`.
- Neutrals: `#fdfdfd #fafafa whitesmoke #ededed #dcdcdb` (borders) `#9c9c98 #6a6b67 #5a5b57` (muted text) `#484947 #383936 #1f201e #191818` (ink).
- Accent orange: `#f4900a` (use sparingly, e.g. one highlight). Secondary blue `#4976f4` exists but is optional.
- Overall look: light, airy, minimal, generous whitespace, thin `#dcdcdb` borders, white cards on `#fafafa`, marketing voice is short and confident ("Know before the RFP drops").

## User requirements (the spec)

- The page must express, in this order and with maximum clarity: (1) the problem (vendors learn at the RFP; too late), (2) the thesis (buying intent is already visible in ordinary board documents), (3) how the prototype works, (4) the backtested result with the 317-day proof and zero control false alarms, (5) the honest limitation (1/5 coverage; more data, not a smarter model).
- Titles, captions, descriptions: minimalistic, easy to read, simple, concise. Short sentences. No jargon walls.
- As many ANIMATED visualization graphs as the story supports, each easy to understand at a glance. Motion should explain (e.g. a timeline that draws itself showing the 317-day gap; a document-to-signal funnel; a district coverage grid; a document-density strip that shows why 4 of 5 trails stayed invisible). Not decoration for its own sake.
- Theme and component design consistent with the NationGraph website (tokens above).

## Technical constraints

- Next.js 16.3.2, App Router, Turbopack (dev AND build; webpack config hard-fails). React 19.2. Server components by default. Read `node_modules/next/dist/docs/` if unsure; training-data instincts about Next are unreliable here.
- JSON module imports (`import metrics from "@/out/metrics.json"`) are the sanctioned data path; Turbopack watches them, so pipeline re-runs live-refresh the dev browser.
- Tailwind CSS v4 (CSS-first config in `globals.css` via `@theme`). Class names must be complete literals in source (v4 scans text; no string concatenation).
- `tw-animate-css` is installed (provides `animate-in`, `fade-in`, `slide-in-from-*`, delays, etc.).
- NO new npm dependencies. No chart libraries. Visualizations are hand-built SVG/CSS.
- CSS-only animation strongly preferred (keyframes, animation-delay staggering, CSS scroll-driven animations where sensible). Client components allowed ONLY where CSS genuinely cannot do it (e.g. IntersectionObserver scroll reveals, count-up numbers); name each one and justify it.
- Respect `prefers-reduced-motion`.
- The dataset is small (4 events). Design must not fake scale; it should make a small, verified dataset feel rigorous rather than sparse.

## Deliverable (the design package)

A single markdown file at your assigned output path, shaped per the rationale template (Problem / Usage / Shape / Tradeoffs / Alternatives / Open questions / Next step), PLUS:

- Section-by-section page spec in reading order, with the ACTUAL copy (titles, captions, descriptions) written out. Copy is part of the design.
- A spec for every visualization: what it shows, which data fields drive it, the exact animation technique (CSS keyframes? scroll-driven? SVG stroke-dashoffset?), and what a viewer understands in 5 seconds.
- The page's core typed data model: name the domain types (e.g. a `CaseStudy` joining trajectory + comparison) and the registries/tables that drive rendering (state metadata, section definitions), per model-the-domain.
- Module map: which files change (`app/page.tsx`, `app/globals.css`, `app/layout.tsx`, any new `components/` or `app/` files), which components are server vs client, and why.
- Do NOT write the implementation. Signatures, sketches, and pseudocode only.
