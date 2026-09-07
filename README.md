# Procurement Trajectory Engine

NationGraph is a small research MVP for one question: can the same school-district cybersecurity initiative be linked across multiple public meetings before it becomes a solicitation?

The repository contains:

- a one-file Python pipeline that scrapes public documents, extracts grounded procurement events, links them into trajectories, and evaluates them against known outcomes;
- a corpus builder that indexes every BoardDocs district in Florida, pulls firewall Form 470 filings from USAC as outcomes, and assembles a pre-registered holdout plus a current-window board;
- offline tests for the linker, clipping, factual-evidence gate, evaluation math, entity mapping, and case construction; and
- a zero-client-JavaScript Next.js site that renders the board, the holdout, and the development receipt.

## Current data status

The committed ledgers cover 8 Florida districts and 124 source documents.

- 5 positive districts with a known 2022 cybersecurity solicitation in `data/outcomes.csv`: Charlotte County (E-rate firewall RFP, 2022-01-20), Flagler (Next Generation Firewall solicitation, 2022-01-21), Hernando (firewall Form 470, 2022-02-16), Miami-Dade (ESSER NIST cybersecurity services RFP, 2022-04-15), and Volusia (Firewall Upgrade RFQ, 2022-09-12).
- 3 control districts with no known cybersecurity purchase in the window: Alachua, Citrus, and Nassau.

Every positive-district source document strictly pre-dates its outcome (the leakage rule). The current run keeps 4 quote-verified events forming 4 single-meeting trajectories. One cleared the match floor: Charlotte County's 2021-03-09 board packet (firewall software, Sinnott Wolach Technology, $179,820) matched the district's E-rate firewall RFP of 2022-01-20 at similarity 0.60 — 317 days early. The 3 controls stayed silent.

## Holdout receipt (pre-registered, 2026-09-07)

The holdout was built by `corpus.py` with no hand-picked documents or outcomes (protocol in `data/DATASET.md`): 45 Florida districts on BoardDocs, outcomes taken from USAC's Form 470 open data, 17 positive cases (a district and funding year with a firewall filing, FY2023 to FY2026) and 17 matched controls, every packet in each 18-month window. The prompt, link threshold, and match floor were the frozen development values.

| | Holdout | Development |
|---|---|---|
| packets read | 1,760 (24 to 81 per case) | 124 (12 to 20 per case) |
| grounded events | 42 | 4 |
| trajectories | 39 | 4 |
| trajectories spanning two or more meetings | 0 | 0 |
| coverage | 1/17 | 1/5 |
| median lead, covered outcomes only | 319 days (one outcome) | 317 days (one outcome) |
| control alarms | 1/17 | 0/3 |
| hand-labeled precision | pending, 1 matched pair | 1/1 |

What the misses say:

- Most E-rate firewall filings are routine annual renewals that never appear before the board as a distinct item. Four positive cases produced no cybersecurity purchase event at all in 26 to 74 packets, and most of the rest produced events about other purchases (endpoint protection, cameras, consulting, web filtering) that correctly scored far below the match floor.
- When a board does pre-authorize the E-rate request, the signal is real but the match floor is brittle. Indian River's March 2022 "E-Rate Category 2" authorization matched the January 2023 filing at 0.53, 319 days early; the same district's near-identical February 2024 E-rate request scored 0.43 against the February 2025 filing and missed.
- The one genuine cross-meeting pair in the corpus split by three thousandths. Walton County discussed "Cyber Security & Solution 1 and 2" in closed session on 2024-06-18 and approved them on 2024-06-27. The closest pair of events scored 0.777 against the 0.78 threshold: the model normalized the category as "cybersecurity solution" in one packet and "cybersecurity service" in the other, so the 0.08 category bonus that would have linked them at 0.857 never applied. The three two-event trajectories that did form are pairs of agenda items from a single meeting.
- The one control alarm is two agenda items from a single Jefferson County meeting in July 2024 approving Fortinet firewall hardware and support. That district never filed an E-rate firewall Form 470 in the window, so it qualified as a control; the alarm is a real purchase made outside E-rate, not a hallucination. The control claim is bounded to E-rate filings and this is what that bound costs.

Nothing in this table was tuned after the holdout ran. The full case table, every evidence quote, and the crawl receipt are on the site's `/holdout` page.

## Board receipt (current window, 2026-09-07)

The same frozen pipeline over the last 18 months of every crawled district, with no outcomes: 45 districts, 2,246 packets, 52 grounded events in 43 trajectories across 21 districts. Five trajectories span two or more meetings, the first cross-meeting links the linker has produced on real data: two annual Fortinet support renewals (Bay, Taylor), a bid increase followed by its expenditure confirmation (Collier), an award request followed by the award two weeks later (Flagler, internet access with basic firewall), and a contractor renewal seen in consecutive years (Leon). Twenty-five of the 52 events are authorizations and 21 are renewals; boards publish approvals far more often than deliberations. The board at `/board` ranks these by stage and links every quote to its packet; the other 24 crawled districts are listed with their packet counts so silence is visible. The home page walks a first-time reader through the claim, the holdout result, the board, the build, and the lessons in that order.

## Run it

Requirements: Python 3.13+, uv, Node.js, pnpm, and an OpenAI API key for non-empty extraction.

~~~powershell
$env:OPENAI_API_KEY = "sk-..."
# Or put OPENAI_API_KEY=sk-... in a gitignored .env file and prefix commands with `uv run --env-file .env`.

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

## Statewide corpus, holdout, and board

`corpus.py` builds the inputs for two more `trajectory.py` runs without touching the model code:

~~~powershell
uv run corpus.py meetings                 # index every BoardDocs district in data/districts.csv
uv run corpus.py outcomes                 # Florida school-district firewall Form 470s from USAC open data
uv run corpus.py cases --from-fy 2023 --to-fy 2026   # data/holdout/{cases,outcomes,sources}.csv
uv run corpus.py board                    # data/board/sources.csv: the last 18 months, every district
uv run corpus.py packets --sources data/holdout/sources.csv --sources data/board/sources.csv
uv run corpus.py stats                    # data/pipeline_stats.json, the crawl receipt
uv run test_corpus.py                     # offline checks for the mapping and case builder

uv run trajectory.py all --sources data/holdout/sources.csv --outcomes data/holdout/outcomes.csv --outdir out-holdout
uv run trajectory.py all --sources data/board/sources.csv --outcomes data/board/outcomes.csv --outdir out-board
~~~

`packets` warms the fetch cache with plain HTTP because BoardDocs packets are static HTML, so the `fetch` stage never needs a browser for them. The holdout protocol is in `data/DATASET.md`. The site renders three runs: `/` is the board (current window, every crawled district), `/holdout` is the pre-registered evaluation with its pipeline receipt, and `/development` is the hand-built development set.

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

The development receipt is coverage `1/5`, median lead time `317` days, hand-labeled precision `1/1`, and control false-positive rate `0/3`; the pre-registered holdout receipt above is coverage `1/17`, median lead `319` days on that one outcome, and control alarms `1/17`. Both medians come from a single covered outcome each, so "N days before the RFP" is a description of two matches, not a performance estimate, and the pitch line should not be used without saying so.

## Known failure modes

- Related products from the same vendor can merge when their language is too similar.
- One initiative can split when meeting descriptions use substantially different language.
- Scanned PDFs need OCR before this pipeline can extract useful text.
- Public cybersecurity discussions may omit sensitive implementation details, leaving no observable early signal.
- Mutable procurement status pages can change after a cached research snapshot; confirm the official page before making a current-status claim.
