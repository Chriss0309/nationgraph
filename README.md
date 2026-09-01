# Procurement Trajectory Engine

NationGraph is a small research MVP for one question: can the same school-district cybersecurity initiative be linked across multiple public meetings before it becomes a solicitation?

The repository contains:

- a one-file Python pipeline that scrapes public documents, extracts grounded procurement events, links them into trajectories, and evaluates them against known outcomes;
- offline tests for the linker, clipping, factual-evidence gate, and evaluation math; and
- a zero-client-JavaScript Next.js screen that renders the committed evaluation receipt.

## Current data status

The committed ledgers cover 8 Florida districts and 124 source documents.

- 5 positive districts with a known 2022 cybersecurity solicitation in `data/outcomes.csv`: Charlotte County (E-rate firewall RFP, 2022-01-20), Flagler (Next Generation Firewall solicitation, 2022-01-21), Hernando (firewall Form 470, 2022-02-16), Miami-Dade (ESSER NIST cybersecurity services RFP, 2022-04-15), and Volusia (Firewall Upgrade RFQ, 2022-09-12).
- 3 control districts with no known cybersecurity purchase in the window: Alachua, Citrus, and Nassau.

Every positive-district source document strictly pre-dates its outcome (the leakage rule). The current run keeps 4 quote-verified events forming 4 single-meeting trajectories. One cleared the match floor: Charlotte County's 2021-03-09 board packet (firewall software, Sinnott Wolach Technology, $179,820) matched the district's E-rate firewall RFP of 2022-01-20 at similarity 0.60 — 317 days early. The 3 controls stayed silent.

## Run it

Requirements: Python 3.13+, uv, Node.js, pnpm, and an OpenAI API key for non-empty extraction.

~~~powershell
$env:OPENAI_API_KEY = "sk-..."

# Once, before scraping a live JavaScript-heavy page.
uvx playwright install chromium

# Inspect and cache every source. This does not call the model.
uv run trajectory.py fetch

# Run each stage independently.
uv run trajectory.py extract
uv run trajectory.py link --threshold 0.78
uv run trajectory.py eval --match-threshold 0.5

# Or run the complete pipeline.
uv run trajectory.py all

# Offline verification; no API key is required.
uv run test_trajectory.py

# UI.
pnpm dev
pnpm build
~~~

For the explicitly fictional smoke fixtures:

~~~powershell
uv run trajectory.py fetch --sources data/fixtures/sources.csv
uv run trajectory.py all `
  --sources data/fixtures/sources.csv `
  --outcomes data/fixtures/outcomes.csv `
  --outdir out-fixtures
~~~

The fixture extraction still needs an API key. Nothing under `data/fixtures/` is real district evidence.

## Input files

`data/sources.csv`:

~~~text
district,meeting_date,source_type,url
~~~

`data/outcomes.csv`:

~~~text
district,outcome_date,outcome_type,title,vendor,url
~~~

Dates must be `YYYY-MM-DD`. A source URL may be HTTP(S) or a repository-relative local path. Positive-case source dates must be earlier than the outcome date to avoid outcome leakage.

## Browser scraper and factuality boundary

The `fetch` stage is the browser-scraping script requested for upstream data:

- remote PDFs use a standard browser user agent, are parsed with pypdf, and fall back to headless Chromium when a portal blocks direct downloads;
- remote HTML is rendered in headless Chromium with Playwright, which covers JavaScript-heavy agenda systems;
- local PDF, HTML, and text saves are read directly; and
- fetched remote text is cached by URL, while local files bypass the cache so edits cannot go stale.

Every source prints its extracted character count, keyword status, and a warning when a PDF produces less than 500 characters. Extraction keeps an event only when its evidence is at most 300 characters and occurs verbatim in the clipped source text. District, date, source type, and URL always come from the CSV—not from model output.

This proves that the quoted evidence exists in the scraped document. It does not make an unsupported summary true, so candidate trajectories still require human review and labels in `out/linked_pairs.csv`.

## How the linker works

Events are sorted deterministically by district, meeting date, source row, and event order. Within one district, each event is compared with the three most recent events in every existing trajectory. The score is embedding cosine similarity plus a small exact/substring category bonus and a same-vendor bonus. The best trajectory wins only when the score meets the threshold; otherwise a new trajectory starts.

The algorithm is intentionally greedy and small. There is no vector database, graph database, agent framework, or hidden scoring layer.

## Evaluation receipt

The committed files consumed by the UI are:

- `out/timelines.json` — linked events with embeddings removed;
- `out/comparison.json` — the best same-district outcome match per trajectory;
- `out/metrics.json` — coverage, median lead time, control false-positive rate, and precision; and
- `out/linked_pairs.csv` — rows for manual `correct` / `incorrect` labeling.

The four headline measurements are:

- coverage: outcomes with at least one qualified trajectory;
- median lead days: earliest signal to outcome, once per covered outcome;
- precision: correct hand labels divided by all hand-labeled pairs; and
- control false-positive rate: control districts with a multi-event trajectory.

The current real-data receipt is coverage `1/5`, median lead time `317` days, hand-labeled precision `1/1`, and control false-positive rate `0/3`. The 317-day median comes from the single covered Charlotte County outcome, so these are implementation receipts rather than credible performance estimates. More unseen positive and control districts are required before using the pitch line publicly.

## Known failure modes

- Related products from the same vendor can merge when their language is too similar.
- One initiative can split when meeting descriptions use substantially different language.
- Scanned PDFs need OCR before this pipeline can extract useful text.
- Public cybersecurity discussions may omit sensitive implementation details, leaving no observable early signal.
- Mutable procurement status pages can change after a cached research snapshot; confirm the official page before making a current-status claim.
