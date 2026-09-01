# Procurement Trajectory Engine — Execution Plan

Self-contained implementation plan for the NationGraph hiring MVP. Written for any agent (or human) executing without access to the planning conversation. Everything needed is in this file, including the starter script (Appendix A).

## How to use this file

- Work the phases in order; each has a verification gate. Do not start a phase until the previous one's gate passes.
- **Before any Next.js/UI work, read `AGENTS.md`** — this repo runs Next 16.3.2, which has breaking changes vs. training data; the shipped docs live in `node_modules/next/dist/docs/`. The UI spec in §Phase 3 already conforms to them, but verify against the docs if anything looks off.
- Engineering style: lazy/minimal. One Python file, no new JS dependencies, no frameworks, shortest working diff. Do not add abstractions, config systems, or scaffolding beyond what this plan names.
- Tasks marked **[HUMAN]** are the project owner's manual work (real-world data collection). Agents must NEVER fabricate real-district data to fill those gaps — fictional data is allowed only in `data/fixtures/`.

## Mission

Prove one primitive: **the same government initiative (school-district cybersecurity purchases) can be identified across multiple board meetings and its path toward an eventual procurement reconstructed** — "temporal entity resolution." Deliberately small, hand-curated dataset (~5 positive Florida districts with known cyber RFPs — Miami-Dade SIEM ITN-25-016-PM, Apr 2026, is #1 — plus 2–3 controls). Effort shape: ~20% ingestion, ~50% trajectory linking, ~20% evaluation, ~10% UI.

**Non-goals (do not build):** mass crawling, agents, vector DBs, graph DBs, CRM/alerts/scoring, model training, tRPC/API layer, dashboards beyond the one screen.

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Pipeline language | Python, ONE file `trajectory.py` | Starter script exists (Appendix A); honest project size |
| Runner | `uv run` + PEP-723 inline deps | uv 0.9.7 + Python 3.13.7 installed; no venv/requirements.txt |
| LLM | OpenAI (key available). Responses API, `EXTRACT_MODEL` default `gpt-5.6-luna`; embeddings `text-embedding-3-small` | Starter assumes it; verify model id against the live models endpoint at implementation time — env-overridable if it differs |
| Linker algorithm | Starter's greedy clustering, UNCHANGED | Deliberate MVP scope; invest in the inspection loop, not a better algorithm |
| UI | One screen in this repo's Next 16 app, zero new deps, zero client components | Native `<details>` covers the only interactivity |
| Unused deps (trpc×5, react-query@4, zod) | Remove via `git restore` | Uncommitted, unused, version-broken pairing |
| Leakage control | Data convention: positive-case source rows strictly pre-date their outcome | Zero code; matches "hide the outcome" backtest discipline |

## Target layout

```
nationgraph/
├─ trajectory.py           # NEW — the ONE pipeline file (PEP-723 header)
├─ test_trajectory.py      # NEW — offline assert-based tests (deps: numpy, pandas only)
├─ data/                   # NEW, committed
│  ├─ sources.csv          # district,meeting_date,source_type,url   (url may be a local path)
│  ├─ outcomes.csv         # district,outcome_date,outcome_type,title,vendor,url
│  ├─ raw/                 # [HUMAN] hand-saved BoardDocs HTML/PDF (committed unless huge)
│  └─ fixtures/            # 5 fictional fixture .txt docs + fixture sources.csv/outcomes.csv
├─ out/                    # pipeline outputs (default --outdir)
│  ├─ events.json          # gitignored (contains embeddings) — link-stage input
│  ├─ events.csv           # gitignored (debug view, no embeddings)
│  ├─ timelines.json       # COMMITTED — UI input
│  ├─ comparison.json      # COMMITTED — UI input
│  ├─ metrics.json         # COMMITTED — the eval receipt
│  └─ linked_pairs.csv     # COMMITTED once hand-labeled
├─ .cache/                 # gitignored: fetch/ extract/ embed/ — sha1-keyed JSON files
└─ app/page.tsx            # REWRITTEN — the one-screen UI (server component)
```

## Commands (Windows PowerShell)

```powershell
$env:OPENAI_API_KEY = "sk-..."     # once per session (or setx for persistence)
uv run trajectory.py all           # or: fetch / extract / link / eval
uv run trajectory.py link --threshold 0.80
uv run trajectory.py all --sources data/fixtures/sources.csv --outcomes data/fixtures/outcomes.csv --outdir out-fixtures
uv run test_trajectory.py          # offline, no key needed
uvx playwright install chromium    # ONLY if a live JS-heavy URL is ever fetched
pnpm install ; pnpm dev ; pnpm build
```

---

## Phase 1 — Scaffold

1. **Drop dead deps:** `git restore package.json pnpm-lock.yaml`, then `pnpm install`. (The five `@trpc/*` packages, `@tanstack/react-query@^4`, and `zod` are uncommitted working-tree additions, imported nowhere; trpc v11 peer-requires react-query v5, so the pairing is broken anyway. Zod goes too — schema enforcement belongs in the Python producer.)
2. **`.gitignore`:** the existing `/out/` line would swallow pipeline outputs (git can't un-ignore files inside an ignored directory). Apply:
   ```diff
   -/out/
   +/out/*
   +!/out/timelines.json
   +!/out/comparison.json
   +!/out/metrics.json
   +!/out/linked_pairs.csv

   +# pipeline
   +/.cache/
   +__pycache__/
   +/out-fixtures/
   ```
3. Create `data/`, `data/raw/`, `data/fixtures/`.
4. Commit the starter script (Appendix A) **verbatim** as `trajectory.py`, with only the PEP-723 header prepended — a baseline so every later change is a reviewable diff:
   ```python
   # /// script
   # requires-python = ">=3.13"
   # dependencies = ["openai", "pandas", "numpy", "requests", "beautifulsoup4", "pypdf", "playwright"]
   # ///
   ```
5. Commit the `AGENTS.md` managed block with this work (it is rewritten by `next dev`; committing keeps the tree clean).

**Gate:** `pnpm build` green (boilerplate page); `git status` clean; `uv run trajectory.py` resolves deps (it will exit complaining about `sources.csv` — that's fine).

---

## Phase 2 — Pipeline (all changes inside `trajectory.py`; it stays one file)

Decompose `main()` into an argparse CLI. Canonical function inventory: `sha1`, `cached(kind, key, compute_fn)`, `load_sources`, `load_outcomes`, `fetch_text(row)`, `keyword_relevant(text)`, `clip_windows(text, max_chars=24000)`, `extract_events(text, row)`, `Event` dataclass, `signature(e)`, `embed_texts(texts)`, `link_events(events, threshold)`, `print_cluster_summary(events)`, `build_timelines(events)`, `match_outcomes(...)`, `evaluate(...)`, `write_json`/`write_csv`, `main()`.

Subcommands: `fetch | extract | link | eval | all`. Shared flags: `--sources data/sources.csv`, `--outcomes data/outcomes.csv`, `--outdir out`. Stage flags: `--threshold 0.78` (link/all), `--match-threshold 0.5` (eval/all).

### Import discipline (enables offline tests)

Module top-level imports: stdlib + numpy + pandas ONLY. `openai`, `requests`, `bs4`, `pypdf`, `playwright` are imported **inside the functions that use them**, and the starter's module-scope `CLIENT = OpenAI()` moves into a lazy `_client()` helper. Consequence: `import trajectory`, `link`, and cached `eval` runs work offline with no API key. Playwright becomes an optional install.

### `fetch`

- Warms the network cache and validates local paths; writes nothing to `out/`.
- Per-row status line: chars extracted, keyword-relevant y/n, **warn if extracted text < 500 chars** (scanned-PDF detector).
- `fetch_text(row)` routing: url starts with `http` → network branch (requests; `.pdf` or PDF content-type → pypdf; else Playwright-rendered body text). Otherwise → path relative to repo root: `.pdf` → pypdf, `.html/.htm` → BeautifulSoup `get_text`, **anything else (incl. `.txt`) → plain UTF-8 read** (makes plain-text fixtures work with zero special-casing).
- **Local files bypass the cache** (re-reading is free; caching invites staleness after hand-edits).

### Disk cache

`.cache/{kind}/{sha1}.json`, three kinds:
- `fetch`: key `sha1(url)` — network URLs only. Value: the extracted TEXT (the expensive part is fetch+render+parse), not raw bytes.
- `extract`: key `sha1(model + "\x00" + PROMPT_VERSION + "\x00" + clipped_text)`. `PROMPT_VERSION` is a module constant, bumped on ANY prompt edit. Value: the parsed, validated events list. **Never cache a failed parse.**
- `embed`: key `sha1(embed_model + "\x00" + signature_text)`. Value: the float list.

### `extract`

- Flow per source row: fetch (cache hit) → `keyword_relevant` short-circuit → `clip_windows` → LLM → embed each event's `signature` → append.
- **Prompt contract changes to a LIST:** return `{"events": [...]}`; an irrelevant document returns `{"events": []}`. **Delete the `relevant` bool from `Event`** — the empty list is the signal. (One agenda can contain "CrowdStrike renewal" AND "SIEM discussion" — this is the fix.)
- The LLM emits content fields only (`initiative_name, normalized_category, state, action, vendor, amount, summary, evidence`); code stamps `district/meeting_date/source_type/url` from the CSV row. Never trust the model with provenance.
- `evidence`: verbatim quote ≤ 300 chars from the provided text (the UI shows this).
- `amount`: accept number or string; `parse_amount` strips `$`/commas → float or None.
- Retry: on `json.JSONDecodeError` or missing/non-list `"events"`, ONE re-call with a terse "return only valid JSON" addendum; second failure → stderr warning + `[]`, never crash the batch. Unknown `state` → coerce to `OTHER` (no retry). Valid states: `DISCUSSION, WORKSHOP, BUDGET, AUTHORIZATION, SOLICITATION, AWARD, RENEWAL, OTHER`.
- Output `out/events.json`, schema pinned:
  ```json
  { "model": "...", "prompt_version": "1", "generated": "2026-08-25T...",
    "events": [ { "district": "...", "meeting_date": "2025-08-21", "source_type": "agenda",
      "url": "...", "initiative_name": "...", "normalized_category": "...",
      "state": "DISCUSSION", "action": "...", "vendor": null, "amount": null,
      "summary": "...", "evidence": "...", "embedding": [1536 floats] } ] }
  ```
  Dates are `YYYY-MM-DD` strings. `cluster_id` is absent here (added by `link`). Parse all dates with explicit `format="%Y-%m-%d"` — hand-typed CSVs + US date ambiguity is a silent-corruption classic.

### `link` (the iteration loop — seconds per run, no API)

- Reads `out/events.json`. Algorithm UNCHANGED from starter: greedy chronological clustering per district; score = cosine vs the most recent 3 members of each cluster, +0.08 same/substring category, +0.08 same vendor; join best cluster if score ≥ threshold, else new cluster. Hard constraint: same district.
- **Determinism (required):** sort events by `(district, meeting_date, source_row_index, event_index)` before clustering (multi-event docs share dates); ties in best-cluster score go to the earliest-created cluster.
- `cluster_id` = `"{district-slug}-{n}"` (readable JSON keys).
- Writes `out/events.csv` (no embeddings) + `out/timelines.json`; prints per-cluster summaries: id, n events, date span, category, state sequence (`DISCUSSION->BUDGET->AUTHORIZATION`), most-common initiative name. **ASCII-only output** (PowerShell cp1252 redirection chokes on fancy glyphs).
- `timelines.json` schema (embeddings stripped — must never reach the UI):
  ```json
  { "miami-dade-0": { "district": "...", "initiative_name": "...", "category": "...",
      "first_date": "2025-08-21", "last_date": "2026-01-14",
      "events": [ { "date": "...", "state": "...", "action": "...", "vendor": null, "amount": null,
                    "summary": "...", "evidence": "...", "url": "...", "source_type": "..." } ] } }
  ```
  `initiative_name` = most frequent non-empty across the cluster; ties → latest event's.

### `eval`

- Reads `out/events.json` + `out/timelines.json` + outcomes CSV; embeds outcome signatures `"title | vendor"` (cached).
- **Match rule:** per cluster, best same-district outcome by cosine(cluster mean-signature embedding, outcome embedding). `matched = similarity >= match_threshold AND earliest_event_date < outcome_date`. **The similarity floor is essential** — without it every cluster matches something and coverage is trivially 100%. Unmatched clusters still emit an entry with `matched: false` + best similarity (debugging gold).
- `lead_days = (outcome_date − min(event dates in cluster)).days`. Clusters spanning past the outcome date: qualification depends only on the earliest event pre-dating the outcome; later events neither disqualify nor shift lead.
- **coverage** = per OUTCOME: covered iff ≥1 same-district cluster has `matched: true` with that outcome as its best match. Many-to-one allowed; the outcome counts once. Multiple outcomes per district evaluated independently; each cluster matches only its single best outcome.
- **median_lead_days** = median over covered outcomes, each contributing its highest-similarity matching cluster's lead.
- **controls** = districts present in sources.csv with zero rows in outcomes.csv — including districts where zero events survived extraction (still in the denominator). **control_fp_rate** = (# control districts containing ≥1 cluster of ≥2 events) / (# control districts); also report the raw count of such clusters.
- Outputs:
  - `out/comparison.json`: `{ "miami-dade-0": { "matched": true, "similarity": 0.63, "outcome_title": "...", "outcome_type": "ITN", "outcome_date": "2026-04-14", "outcome_url": "...", "lead_days": 236 } }`
  - `out/metrics.json`: `{ n_docs, n_events, n_clusters, coverage: {covered, total, rate}, median_lead_days, control_fp: {firing_districts, control_districts, rate, n_multi_event_clusters}, threshold, match_threshold }`
  - `out/linked_pairs.csv`: columns `district, cluster_id, initiative_name, first_event_date, n_events, outcome_title, outcome_date, similarity, lead_days, matched, label` — `label` left blank for hand-marking `correct`/`incorrect`; precision = correct/labeled.

### Fixtures (`data/fixtures/`, fictional districts only)

Five ~40–60-line `.txt` docs with board-minutes furniture (roll call, agenda numbering, one unrelated item like bus routing) so clipping has non-signal text to cut:

1. `hillsview_2025-08-21_discussion.txt` — IT director presents ransomware risk assessment; board discusses need for "security information and event management (SIEM)" monitoring. No vendor, no dollars. Expected: 1 event, DISCUSSION.
2. `hillsview_2025-11-13_budget.txt` — budget amendment; "$450,000 earmarked for a cybersecurity monitoring platform (SIEM implementation)"; vendors deliberately unnamed. Expected: 1 event, BUDGET, amount 450000.
3. `hillsview_2026-01-15_authorization.txt` — board authorizes superintendent to issue an RFP for SIEM services; motion carries 6–1. Expected: 1 event, AUTHORIZATION.
4. `hillsview_2025-09-04_distractor.txt` — policy committee adopts a revised **cyberbullying prevention policy** + digital-citizenship curriculum; deliberately keyword-dense ("cyber", "internet safety") so the cheap keyword filter PASSES it and the LLM must return `{"events": []}`. This tests the layer that matters.
5. `lakemont_2025-10-02_facilities.txt` — control district; roof repairs and HVAC; zero cyber keywords → dropped by the keyword filter. Exists so the control denominator counts a zero-event district.

`data/fixtures/sources.csv`: the 5 rows, `url = data/fixtures/<file>.txt`.
`data/fixtures/outcomes.csv`: one row — `Hillsview,2026-04-10,RFP,"RFP 26-014 Security Information and Event Management (SIEM) System",,https://example.com/rfp-26-014`. Lakemont has no row → control.

Expected fixture end state (`--outdir out-fixtures`; LLM-dependent → manual smoke check, not asserted): 3 events, all Hillsview; exactly 1 cluster, state sequence DISCUSSION→BUDGET→AUTHORIZATION; coverage 1/1; lead_days 232 (2025-08-21 → 2026-04-10); control_fp 0/1.

### `test_trajectory.py` (offline, plain asserts, ~150 lines)

PEP-723 header with `numpy`, `pandas` only (works because of the import discipline above).

- **Linker, synthetic embeddings** — 2-D unit vectors give exact cosines (`[1,0]` vs `[cosθ, sinθ]`). Construct `Event` objects directly with `embedding=` set; assert on `link_events(events, threshold=0.78)`:
  1. Three events pairwise-cosine ≈0.95 → one cluster.
  2. Orthogonal vector, same district/category → new cluster (0 + 0.08 < 0.78).
  3. Category bonus tips it: cosine 0.72 pair, same category → 0.80 ≥ 0.78 merged; different categories → split. One extra case for the vendor bonus.
  4. Last-3 window: 6th event matching only member #1 of a 5-member cluster does NOT join.
  5. District isolation: identical vectors, different districts → separate clusters.
  6. Determinism: shuffle equal-date input rows → identical assignment (exercises the pinned sort key).
- **`clip_windows`**: `"A"*10000 + "cybersecurity" + "B"*100 + "ransomware" + "C"*10000` → result contains both keywords, exactly one copy of the B-run (merged overlapping windows, no duplication), `len <= max_chars`, distant filler excluded; keyword at position 0 doesn't crash; no-keyword text → head slice.
- **Eval edge cases** (inject synthetic outcome embeddings): earliest event post-dates outcome → not covered; below-floor similarity → `matched: false`; control district with zero events still in denominator; lead_days arithmetic on a known date pair.

**Gate:** `uv run test_trajectory.py` passes with **no `OPENAI_API_KEY` set**. Then, with the key: fixture run produces the expected end state above; an immediate rerun is near-instant (cache hit) with identical output.

---

## Phase 3 — UI (one screen, no new deps)

Single-file rewrite of `app/page.tsx` (~150 lines, **server component**), plus a one-line `metadata.title` change in `app/layout.tsx` → "Procurement Trajectory Engine". Keep layout's `LayoutProps<"/">` signature — it's the Next 16 generated global type, not a mistake.

- **Data loading:** `import timelines from "@/out/timelines.json"` (+ `comparison`, `metrics`). `resolveJsonModule` and the `@/*`→root alias are already on. Module imports are the docs-sanctioned prerender-safe pattern (`node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` §"Predictable values"), and Turbopack watches imported JSON → **re-running `link`/`eval` auto-refreshes the browser during `pnpm dev`** — that's the demo loop. A missing JSON fails the build, which enforces the committed-outputs rule: **seed `out/` from a fixture run in the same commit that adds this page.**
- **Interactivity:** native `<details>/<summary>` per event; `name={clusterId}` gives one-open-at-a-time accordion per card. Zero client components, zero shipped JS.
- **Types:** local `type TrajectoryEvent / Trajectory / Comparison` + `as` casts on the imports (widens `state` to the union).
- **Styling:** Tailwind v4 utilities only. `STATE_STYLE: Record<string, string>` with **complete literal class strings** (`DISCUSSION: "bg-sky-400"`, `WORKSHOP: "bg-sky-300"`, `BUDGET: "bg-amber-400"`, `AUTHORIZATION: "bg-violet-500"`, `SOLICITATION: "bg-emerald-500"`, `AWARD: "bg-emerald-700"`, `RENEWAL: "bg-teal-500"`, fallback `bg-zinc-400`) — Tailwind v4 scans source text; never build class names by concatenation. Keep the existing `--background/--foreground` vars; `dark:` variants on card surfaces only.
- **Render:** `Object.entries(timelines)` sorted by `(district, first_date)`. Card = district + initiative header; `<ol className="relative border-l ... pl-6">` timeline; each `<li>` a `<details name={clusterId}>` whose `<summary>` shows an absolutely-positioned state dot (`absolute -left-[6.5px] size-3 rounded-full ${STATE_STYLE[state]}`), date, state label, and one-line action; body = `<blockquote>{evidence}</blockquote>` + source link (external: `target="_blank" rel="noreferrer"`; local `data/raw/` paths render as plain captions, not links). Below the timeline: "First signal {lead_days} days before solicitation" and, when `comparison[clusterId].matched`, a green "✓ Matched eventual procurement: {outcome_title}" badge linking `outcome_url`. Footer stat line from `metrics.json` (coverage, median lead, control FP).

**Gate:** `pnpm dev` renders cards with dots/badges/expanding evidence on fixture data; while dev runs, `uv run trajectory.py link --threshold 0.85` then `eval` → browser auto-refreshes with new clustering; `pnpm build` green.

---

## Phase 4 — Real data, linking iteration, eval (the 50% zone)

**[HUMAN] Data collection (can start day one, parallel to all phases):**
- `data/outcomes.csv`: ~5 known Florida K-12 cyber procurements (Miami-Dade SIEM ITN-25-016-PM, 2026-04-14, first), + nothing for 2–3 control districts.
- Per positive: 12–18 months of board agendas/minutes BEFORE the outcome date → rows in `data/sources.csv`. JS-heavy BoardDocs pages: save from the browser into `data/raw/` and point the CSV at the local path.
- **Leakage rule: positive-case source rows strictly pre-date their outcome.**

**Agent/owner iteration protocol once data exists:**
1. `uv run trajectory.py fetch` — inspect char counts, fix bad saves.
2. `uv run trajectory.py extract` — the only real spend (cheap model on clipped excerpts; cached thereafter).
3. Iterate `link --threshold 0.74 / 0.78 / 0.82` reading printed cluster summaries; eyeball false merges/splits.
4. `eval` → hand-label `out/linked_pairs.csv` → re-run `eval` for precision.
5. Every false merge found (e.g. "Microsoft Defender renewal" + "Microsoft security training") gets a note in the README — the failure analysis is interview material.
6. Commit `timelines.json`, `comparison.json`, `metrics.json`, labeled `linked_pairs.csv`.

**Finish:** README write-up — what it does, how the linker works, the four numbers (coverage, median lead days, precision, control FP rate), known failure modes, and the pitch line: "first observable signal a median N days before solicitation."

**Gate:** metrics are computed from real data with the leakage rule honored; Miami-Dade trajectory reconstructed with first signal pre-dating 2026-04-14; `pnpm build` green from a clean checkout.

---

## Appendix A — Starter script (commit verbatim as `trajectory.py` in Phase 1)

```python
#!/usr/bin/env python3
"""
NationGraph-style Procurement Trajectory MVP

Goal:
1) Read public board agenda/minute URLs from sources.csv
2) Extract cybersecurity-related events
3) Embed + link likely references to the same initiative across meetings
4) Build timelines
5) Compare timelines against known RFP/award outcomes

This intentionally does NOT try to crawl every district website.
For an MVP, discovery can be manual/semi-manual so the engineering work
stays focused on the temporal-linking problem.

Required files:

sources.csv
-----------
district,meeting_date,source_type,url
Miami-Dade County Public Schools,2025-09-10,agenda,https://...
Miami-Dade County Public Schools,2026-01-14,minutes,https://...

outcomes.csv
------------
district,outcome_date,outcome_type,title,vendor,url
Miami-Dade County Public Schools,2026-04-14,RFP,Security Information & Event Management,,https://...

Install:
pip install openai pandas numpy requests beautifulsoup4 pypdf playwright
playwright install chromium

Environment:
export OPENAI_API_KEY=...

Run:
python nationgraph_trajectory_mvp.py
"""

from __future__ import annotations

import io
import json
import math
import os
import re
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup
from openai import OpenAI
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

CLIENT = OpenAI()

EXTRACT_MODEL = os.getenv("EXTRACT_MODEL", "gpt-5.6-luna")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")

CYBER_TERMS = [
    "cybersecurity", "cyber security", "information security",
    "endpoint", "endpoint detection", "edr", "xdr",
    "crowdstrike", "sentinelone", "defender",
    "siem", "security information and event management",
    "soc", "security operations center",
    "mfa", "multi-factor", "multifactor",
    "firewall", "zero trust", "ransomware",
    "identity access", "iam", "vulnerability",
    "penetration test", "incident response",
    "network security", "email security", "phishing",
]

VALID_STATES = {
    "DISCUSSION",
    "WORKSHOP",
    "BUDGET",
    "AUTHORIZATION",
    "SOLICITATION",
    "AWARD",
    "RENEWAL",
    "OTHER",
}

@dataclass
class Event:
    district: str
    meeting_date: str
    source_type: str
    url: str

    relevant: bool
    initiative_name: str
    normalized_category: str
    state: str
    action: str
    vendor: str | None
    amount: float | None
    summary: str
    evidence: str

    embedding: list[float] | None = None
    cluster_id: str | None = None


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def fetch_pdf(url: str) -> str:
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    reader = PdfReader(io.BytesIO(r.content))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return clean_text("\n".join(pages))


def fetch_dynamic_html(url: str) -> str:
    # Board agenda systems are often JS-heavy; browser rendering is safer.
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        page.wait_for_timeout(1500)
        text = page.locator("body").inner_text(timeout=15_000)
        browser.close()
    return clean_text(text)


def fetch_text(url: str) -> str:
    if url.lower().split("?")[0].endswith(".pdf"):
        return fetch_pdf(url)
    return fetch_dynamic_html(url)


def cheap_candidate_filter(text: str) -> bool:
    low = text.lower()
    return any(term in low for term in CYBER_TERMS)


def clip_around_keywords(text: str, radius: int = 4000) -> str:
    """
    Avoid sending an entire huge agenda when possible.
    Keep windows around cybersecurity terms.
    """
    low = text.lower()
    spans = []
    for term in CYBER_TERMS:
        start = 0
        while True:
            idx = low.find(term, start)
            if idx == -1:
                break
            spans.append((max(0, idx - radius), min(len(text), idx + len(term) + radius)))
            start = idx + len(term)

    if not spans:
        return text[:12_000]

    spans.sort()
    merged = []
    for s, e in spans:
        if not merged or s > merged[-1][1]:
            merged.append([s, e])
        else:
            merged[-1][1] = max(merged[-1][1], e)

    return "\n...\n".join(text[s:e] for s, e in merged)[:24_000]


def parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def extract_event(row: pd.Series, text: str) -> Event:
    excerpt = clip_around_keywords(text)

    prompt = f"""
You are extracting a procurement-relevant cybersecurity event from a US public-school
board agenda or meeting-minutes document.

District: {row["district"]}
Meeting date: {row["meeting_date"]}
Source type: {row["source_type"]}

Return ONLY valid JSON with exactly these keys:
{{
  "relevant": true,
  "initiative_name": "short canonical initiative name",
  "normalized_category": "e.g. SIEM, EDR, MFA, firewall, SOC, cybersecurity services",
  "state": "DISCUSSION|WORKSHOP|BUDGET|AUTHORIZATION|SOLICITATION|AWARD|RENEWAL|OTHER",
  "action": "what happened at this meeting",
  "vendor": null,
  "amount": null,
  "summary": "1-2 sentence factual summary",
  "evidence": "short supporting phrase from the document"
}}

Rules:
- relevant=false if this is merely a generic cybersecurity policy, student safety,
  cyberbullying, acceptable-use policy, or unrelated security topic with no plausible
  procurement/technology initiative.
- Do NOT infer a purchase if the document does not support it.
- "WORKSHOP" means a workshop/discussion stage, not that procurement is guaranteed.
- "AUTHORIZATION" means board approval to proceed/spend/contract.
- "SOLICITATION" means RFP/ITN/IFB/RFQ or equivalent procurement action.
- "AWARD" means an actual vendor/contract award.
- "RENEWAL" means renewal/extension of an existing product or contract.
- amount must be a number only or null.
- evidence should be concise and copied only from the provided text.

DOCUMENT:
{excerpt}
"""

    response = CLIENT.responses.create(
        model=EXTRACT_MODEL,
        input=prompt,
    )
    data = parse_json(response.output_text)

    state = str(data.get("state", "OTHER")).upper()
    if state not in VALID_STATES:
        state = "OTHER"

    return Event(
        district=str(row["district"]),
        meeting_date=str(row["meeting_date"]),
        source_type=str(row["source_type"]),
        url=str(row["url"]),
        relevant=bool(data.get("relevant", False)),
        initiative_name=str(data.get("initiative_name", "")).strip(),
        normalized_category=str(data.get("normalized_category", "")).strip(),
        state=state,
        action=str(data.get("action", "")).strip(),
        vendor=(str(data["vendor"]).strip() if data.get("vendor") else None),
        amount=(float(data["amount"]) if data.get("amount") not in (None, "") else None),
        summary=str(data.get("summary", "")).strip(),
        evidence=str(data.get("evidence", "")).strip(),
    )


def embed(text: str) -> list[float]:
    response = CLIENT.embeddings.create(
        model=EMBED_MODEL,
        input=text,
    )
    return response.data[0].embedding


def cosine(a: list[float], b: list[float]) -> float:
    x = np.asarray(a, dtype=np.float32)
    y = np.asarray(b, dtype=np.float32)
    denom = np.linalg.norm(x) * np.linalg.norm(y)
    return float(np.dot(x, y) / denom) if denom else 0.0


def event_signature(event: Event) -> str:
    return " | ".join([
        event.initiative_name,
        event.normalized_category,
        event.vendor or "",
        event.summary,
    ])


def link_score(a: Event, b: Event) -> float:
    """
    MVP linkage score.
    Main signal = semantic similarity.
    Small boosts for category/vendor overlap.
    Hard constraint = same district.
    """
    if a.district != b.district:
        return -1.0

    if not a.embedding or not b.embedding:
        return -1.0

    score = cosine(a.embedding, b.embedding)

    cat_a = a.normalized_category.lower().strip()
    cat_b = b.normalized_category.lower().strip()
    if cat_a and cat_b and (cat_a == cat_b or cat_a in cat_b or cat_b in cat_a):
        score += 0.08

    if a.vendor and b.vendor and a.vendor.lower() == b.vendor.lower():
        score += 0.08

    return score


def cluster_events(events: list[Event], threshold: float = 0.78) -> list[Event]:
    """
    Greedy chronological clustering per district.

    Good enough for an MVP because the purpose is to test whether
    temporal linking is useful before building a more sophisticated model.
    """
    events = sorted(events, key=lambda e: (e.district, e.meeting_date))
    clusters: dict[str, list[Event]] = {}
    counter = 1

    for event in events:
        best_cluster = None
        best_score = -1.0

        for cluster_id, members in clusters.items():
            if members[0].district != event.district:
                continue

            # Compare with the most recent 3 events in each trajectory.
            scores = [link_score(event, m) for m in members[-3:]]
            score = max(scores) if scores else -1.0

            if score > best_score:
                best_score = score
                best_cluster = cluster_id

        if best_cluster and best_score >= threshold:
            event.cluster_id = best_cluster
            clusters[best_cluster].append(event)
        else:
            cluster_id = f"T{counter:03d}"
            counter += 1
            event.cluster_id = cluster_id
            clusters[cluster_id] = [event]

    return events


def load_outcomes(path: str = "outcomes.csv") -> pd.DataFrame:
    if not Path(path).exists():
        return pd.DataFrame()
    df = pd.read_csv(path)
    df["outcome_date"] = pd.to_datetime(df["outcome_date"])
    return df


def compare_to_outcomes(events: list[Event], outcomes: pd.DataFrame) -> list[dict[str, Any]]:
    """
    For each trajectory, find the best-matching later procurement outcome.
    This is evaluation/ground truth, not part of the product UI.
    """
    if outcomes.empty:
        return []

    results = []
    by_cluster: dict[str, list[Event]] = {}

    for event in events:
        if event.cluster_id:
            by_cluster.setdefault(event.cluster_id, []).append(event)

    outcome_embeddings: dict[int, list[float]] = {}
    for idx, row in outcomes.iterrows():
        sig = f'{row["title"]} | {row.get("vendor", "")} | {row["outcome_type"]}'
        outcome_embeddings[idx] = embed(sig)

    for cluster_id, members in by_cluster.items():
        members = sorted(members, key=lambda e: e.meeting_date)
        last = members[-1]
        last_date = pd.to_datetime(last.meeting_date)

        trajectory_text = " | ".join(event_signature(e) for e in members)
        trajectory_embedding = embed(trajectory_text[:8000])

        candidates = outcomes[
            (outcomes["district"] == last.district)
            & (outcomes["outcome_date"] >= last_date)
        ]

        best = None
        for idx, row in candidates.iterrows():
            sim = cosine(trajectory_embedding, outcome_embeddings[idx])
            if best is None or sim > best["similarity"]:
                best = {
                    "cluster_id": cluster_id,
                    "district": last.district,
                    "first_signal_date": members[0].meeting_date,
                    "last_signal_date": last.meeting_date,
                    "num_events": len(members),
                    "outcome_date": str(row["outcome_date"].date()),
                    "outcome_type": row["outcome_type"],
                    "outcome_title": row["title"],
                    "similarity": round(sim, 4),
                    "lead_days": int((row["outcome_date"] - pd.to_datetime(members[0].meeting_date)).days),
                    "outcome_url": row.get("url", ""),
                }

        if best:
            results.append(best)

    return results


def build_timelines(events: list[Event]) -> dict[str, list[dict[str, Any]]]:
    timelines: dict[str, list[dict[str, Any]]] = {}

    for event in sorted(events, key=lambda e: (e.cluster_id or "", e.meeting_date)):
        if not event.cluster_id:
            continue
        timelines.setdefault(event.cluster_id, []).append({
            "district": event.district,
            "date": event.meeting_date,
            "state": event.state,
            "initiative": event.initiative_name,
            "category": event.normalized_category,
            "vendor": event.vendor,
            "amount": event.amount,
            "action": event.action,
            "summary": event.summary,
            "evidence": event.evidence,
            "url": event.url,
        })

    return timelines


def main() -> None:
    sources_path = Path("sources.csv")
    if not sources_path.exists():
        raise SystemExit("Missing sources.csv")

    sources = pd.read_csv(sources_path)
    required = {"district", "meeting_date", "source_type", "url"}
    missing = required - set(sources.columns)
    if missing:
        raise SystemExit(f"sources.csv missing columns: {sorted(missing)}")

    extracted: list[Event] = []

    for i, row in sources.iterrows():
        print(f'[{i+1}/{len(sources)}] {row["district"]} {row["meeting_date"]}')
        try:
            text = fetch_text(str(row["url"]))
        except Exception as exc:
            print(f"  fetch failed: {exc}")
            continue

        if not cheap_candidate_filter(text):
            print("  skipped: no cyber keywords")
            continue

        try:
            event = extract_event(row, text)
        except Exception as exc:
            print(f"  extraction failed: {exc}")
            continue

        if not event.relevant:
            print("  skipped: not procurement-relevant")
            continue

        event.embedding = embed(event_signature(event))
        extracted.append(event)
        print(f"  kept: {event.state} | {event.initiative_name}")

        # Be polite to source websites/APIs.
        time.sleep(0.2)

    linked = cluster_events(extracted)

    events_df = pd.DataFrame([
        {k: v for k, v in asdict(e).items() if k != "embedding"}
        for e in linked
    ])
    events_df.to_csv("events.csv", index=False)

    timelines = build_timelines(linked)
    Path("timelines.json").write_text(
        json.dumps(timelines, indent=2),
        encoding="utf-8"
    )

    outcomes = load_outcomes()
    comparison = compare_to_outcomes(linked, outcomes)
    Path("comparison.json").write_text(
        json.dumps(comparison, indent=2),
        encoding="utf-8"
    )

    print("\nDone.")
    print(f"Relevant events: {len(linked)}")
    print(f"Trajectories: {len(timelines)}")
    print("Wrote: events.csv, timelines.json, comparison.json")


if __name__ == "__main__":
    main()
```

## Appendix B — Environment facts (verified 2026-08-25)

- Windows 11, PowerShell primary shell. Node v24.18.1, pnpm 10.29.2 (matches `packageManager` pin), Python 3.13.7 (`python` and `py` both work; `python3` does not), uv 0.9.7, git 2.46.2.
- Next 16.3.2 specifics that bite training-data instincts: Turbopack default for dev AND build (any webpack config hard-fails the build); `next lint` removed (`"lint": "eslint"`, flat config); `params`/`searchParams` are async Promises; `middleware.ts` → `proxy.ts`; `next dev` writes to `.next/dev`; the AGENTS.md managed block is regenerated by `next dev` — commit it, don't fight it.
- `.cursor/` contains only untracked hook state — no rules to obey. The only agent instructions in-repo are `AGENTS.md`/`CLAUDE.md`.
