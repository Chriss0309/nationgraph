# /// script
# requires-python = ">=3.13"
# dependencies = ["openai", "pandas", "numpy", "requests", "beautifulsoup4", "pypdf", "playwright"]
# ///
#!/usr/bin/env python3
"""Build procurement trajectories from public school-board documents."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import os
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / ".cache"
PROMPT_VERSION = "2"
EXTRACT_VALIDATION_VERSION = "2"
FETCH_VERSION = "2"
MIN_RENDERED_TEXT_CHARS = 100
EXTRACT_MODEL = os.getenv("EXTRACT_MODEL", "gpt-5.6-luna")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
HTTP_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/140.0.0.0 Safari/537.36"
)

CYBER_TERMS = [
    "cybersecurity",
    "cyber security",
    "information security",
    "endpoint",
    "endpoint detection",
    "edr",
    "xdr",
    "crowdstrike",
    "sentinelone",
    "defender",
    "siem",
    "security information and event management",
    "soc",
    "security operations center",
    "mfa",
    "multi-factor",
    "multifactor",
    "firewall",
    "zero trust",
    "ransomware",
    "identity access",
    "iam",
    "vulnerability",
    "penetration test",
    "incident response",
    "network security",
    "email security",
    "phishing",
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

EVENT_FIELDS = [
    "district",
    "meeting_date",
    "source_type",
    "url",
    "initiative_name",
    "normalized_category",
    "state",
    "action",
    "vendor",
    "amount",
    "summary",
    "evidence",
]

_CLIENT: Any | None = None


@dataclass
class Event:
    district: str
    meeting_date: str
    source_type: str
    url: str
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
    source_row_index: int = 0
    event_index: int = 0


class InvalidEventsPayload(ValueError):
    """The model returned JSON that does not satisfy the list contract."""


def sha1(value: str | bytes) -> str:
    data = value.encode("utf-8") if isinstance(value, str) else value
    return hashlib.sha1(data).hexdigest()


def cached(kind: str, key: str, compute_fn: Callable[[], Any]) -> Any:
    path = CACHE_DIR / kind / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))

    value = compute_fn()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    return value


def _required_columns(df: pd.DataFrame, required: set[str], path: Path) -> None:
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"{path} missing columns: {sorted(missing)}")


def _parse_dates(df: pd.DataFrame, column: str, path: Path) -> None:
    if df.empty:
        return
    try:
        parsed = pd.to_datetime(df[column], format="%Y-%m-%d", errors="raise")
    except (TypeError, ValueError) as exc:
        raise SystemExit(f"{path} has invalid {column}; expected YYYY-MM-DD: {exc}") from exc
    df[column] = parsed.dt.strftime("%Y-%m-%d")


def load_sources(path: str | Path = "data/sources.csv") -> pd.DataFrame:
    source_path = Path(path)
    if not source_path.is_absolute():
        source_path = ROOT / source_path
    if not source_path.exists():
        raise SystemExit(f"Missing sources file: {source_path}")
    df = pd.read_csv(source_path, dtype=str, keep_default_na=False)
    _required_columns(df, {"district", "meeting_date", "source_type", "url"}, source_path)
    _parse_dates(df, "meeting_date", source_path)
    df["source_row_index"] = range(len(df))
    return df


def load_outcomes(path: str | Path = "data/outcomes.csv") -> pd.DataFrame:
    outcome_path = Path(path)
    if not outcome_path.is_absolute():
        outcome_path = ROOT / outcome_path
    if not outcome_path.exists():
        raise SystemExit(f"Missing outcomes file: {outcome_path}")
    df = pd.read_csv(outcome_path, dtype=str, keep_default_na=False)
    _required_columns(
        df,
        {"district", "outcome_date", "outcome_type", "title", "vendor", "url"},
        outcome_path,
    )
    _parse_dates(df, "outcome_date", outcome_path)
    return df.reset_index(drop=True)


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return clean_text("\n".join(page.extract_text() or "" for page in reader.pages))


def _browser_network_text(url: str) -> str:
    """Fetch a document through Chromium and extract PDF bytes or rendered HTML."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            navigation = page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            if navigation is not None:
                if not navigation.ok:
                    raise RuntimeError(f"browser returned HTTP {navigation.status} for {url}")

                content_type = navigation.headers.get("content-type", "").lower()
                response_bytes = navigation.body()
                if "application/pdf" in content_type or response_bytes.lstrip().startswith(b"%PDF-"):
                    return _pdf_text(response_bytes)

            body = page.locator("body")
            best_text = ""
            stable_polls = 0
            for attempt in range(24):
                try:
                    rendered_text = clean_text(body.inner_text(timeout=1_000))
                except Exception:
                    # The body can be briefly unavailable while a JS app replaces its shell.
                    rendered_text = ""

                if len(rendered_text) > len(best_text):
                    best_text = rendered_text
                    stable_polls = 0
                elif rendered_text == best_text and len(best_text) >= MIN_RENDERED_TEXT_CHARS:
                    stable_polls += 1

                if stable_polls >= 1:
                    return best_text
                if attempt < 23:
                    page.wait_for_timeout(500)

            if len(best_text) >= MIN_RENDERED_TEXT_CHARS:
                return best_text
            raise RuntimeError(
                f"browser rendered only {len(best_text)} characters for {url}; "
                "document may not have finished loading"
            )
        finally:
            browser.close()


def _network_text(url: str) -> str:
    def compute() -> str:
        import requests

        looks_like_pdf = url.lower().split("?", 1)[0].endswith(".pdf")
        try:
            response = requests.get(
                url,
                timeout=30,
                allow_redirects=True,
                headers={"User-Agent": HTTP_USER_AGENT},
            )
        except requests.RequestException:
            if looks_like_pdf:
                return _browser_network_text(url)
            raise

        content_type = response.headers.get("content-type", "").lower()
        if looks_like_pdf or "application/pdf" in content_type:
            if response.ok:
                try:
                    return _pdf_text(response.content)
                except Exception:
                    # Some portals return an interstitial with PDF headers; retry as a browser.
                    return _browser_network_text(url)
            return _browser_network_text(url)

        # Agenda systems frequently render the useful document only in a browser.
        return _browser_network_text(url)

    return str(cached("fetch", sha1(f"{FETCH_VERSION}:{url}"), compute))


def fetch_text(row: pd.Series | dict[str, Any]) -> str:
    url = str(row["url"]).strip()
    if url.lower().startswith(("http://", "https://")):
        return _network_text(url)

    path = Path(url)
    if not path.is_absolute():
        path = ROOT / path
    if not path.is_file():
        raise FileNotFoundError(f"local source does not exist: {path}")

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _pdf_text(path.read_bytes())
    if suffix in {".html", ".htm"}:
        from bs4 import BeautifulSoup

        return clean_text(BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser").get_text(" "))
    return clean_text(path.read_text(encoding="utf-8"))


def keyword_relevant(text: str) -> bool:
    low = text.lower()
    return any(term in low for term in CYBER_TERMS)


def clip_windows(text: str, max_chars: int = 24_000) -> str:
    low = text.lower()
    radius = 4_000
    spans: list[tuple[int, int]] = []
    for term in CYBER_TERMS:
        start = 0
        while True:
            index = low.find(term, start)
            if index < 0:
                break
            spans.append((max(0, index - radius), min(len(text), index + len(term) + radius)))
            start = index + len(term)

    if not spans:
        return text[:max_chars]

    merged: list[list[int]] = []
    for start, end in sorted(spans):
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return "\n...\n".join(text[start:end] for start, end in merged)[:max_chars]


def _client() -> Any:
    global _CLIENT
    if _CLIENT is None:
        from openai import OpenAI

        _CLIENT = OpenAI()
    return _CLIENT


def _parse_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    data = json.loads(cleaned)
    if not isinstance(data, dict) or not isinstance(data.get("events"), list):
        raise InvalidEventsPayload('response must contain an "events" list')
    return data


def parse_amount(value: Any) -> float | None:
    if value in (None, "") or isinstance(value, bool):
        return None
    text = str(value).strip()
    try:
        return float(text.replace("$", "").replace(",", ""))
    except ValueError:
        pass

    match = re.fullmatch(
        r"\$?\s*(\d[\d,]*(?:\.\d+)?)\s*"
        r"(?:/?\s*(?:annually|yearly|monthly|quarterly|per\s+(?:year|month|quarter)"
        r"|\d+\s+(?:year|month)s?(?:\s+coverage)?))",
        text,
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    return float(match.group(1).replace(",", ""))


def _content_string(value: Any) -> str:
    return "" if value is None else str(value).strip()


def _source_contains_amount(source_text: str, amount: float) -> bool:
    candidates = re.findall(
        r"(?<![\w])\$?\s*\d[\d,]*(?:\.\d+)?(?![\w])",
        source_text,
    )
    return any(
        parsed is not None and math.isclose(parsed, amount, rel_tol=0.0, abs_tol=0.005)
        for candidate in candidates
        if (parsed := parse_amount(candidate)) is not None
    )


def _grounded_content_event(
    raw: dict[str, Any], source_text: str, event_index: int
) -> dict[str, Any] | None:
    evidence = _content_string(raw.get("evidence"))
    if not evidence or len(evidence) > 300 or evidence not in source_text:
        print(
            f"  warning: dropped event {event_index + 1}; evidence must be a verbatim "
            "source quote of at most 300 characters",
            file=sys.stderr,
        )
        return None

    vendor = _content_string(raw.get("vendor")) or None
    if vendor and vendor.casefold() not in source_text.casefold():
        print(
            f"  warning: dropped event {event_index + 1}; vendor is not present in source text",
            file=sys.stderr,
        )
        return None

    raw_amount = raw.get("amount")
    amount = parse_amount(raw_amount)
    if raw_amount not in (None, "") and (
        amount is None or not _source_contains_amount(source_text, amount)
    ):
        print(
            f"  warning: dropped event {event_index + 1}; amount is not supported by source text",
            file=sys.stderr,
        )
        return None

    state = _content_string(raw.get("state", "OTHER")).upper()
    return {
        "initiative_name": _content_string(raw.get("initiative_name")),
        "normalized_category": _content_string(raw.get("normalized_category")),
        "state": state if state in VALID_STATES else "OTHER",
        "action": _content_string(raw.get("action")),
        "vendor": vendor,
        "amount": amount,
        "summary": _content_string(raw.get("summary")),
        "evidence": evidence,
    }


def _validated_content_events(
    data: dict[str, Any], source_text: str
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for event_index, raw in enumerate(data["events"]):
        if not isinstance(raw, dict):
            continue
        grounded = _grounded_content_event(raw, source_text, event_index)
        if grounded is not None:
            events.append(grounded)
    return events


def extract_events(text: str, row: pd.Series | dict[str, Any]) -> list[Event]:
    excerpt = clip_windows(text)
    prompt = f"""
You are extracting procurement-relevant cybersecurity events from a US public-school
board agenda or meeting-minutes document.

Meeting date: {row["meeting_date"]}
Source type: {row["source_type"]}

Return ONLY valid JSON in this shape:
{{"events": [{{
  "initiative_name": "short canonical initiative name",
  "normalized_category": "SIEM, EDR, MFA, firewall, SOC, or similar",
  "state": "DISCUSSION|WORKSHOP|BUDGET|AUTHORIZATION|SOLICITATION|AWARD|RENEWAL|OTHER",
  "action": "what happened at this meeting",
  "vendor": null,
  "amount": null,
  "summary": "1-2 sentence factual summary",
  "evidence": "one contiguous verbatim quote, 40 to 220 characters"
}}]}}

Rules:
- Return {{"events": []}} unless the document supports a concrete cybersecurity
  purchasing path: discussion of acquiring a product/service, budget, authorization,
  solicitation, award, renewal, or an explicit plan to engage a vendor.
- Generic policy, student safety, cyberbullying, acceptable-use policy, and unrelated
  technology/data modernization are not cybersecurity procurement events.
- Do not extract an already-implemented technology, routine operational update, or
  general security improvement unless this meeting contains a current purchasing,
  contracting, budget, or vendor-engagement signal for it.
- A document may contain multiple distinct procurement decisions. Return each decision
  separately, but do not turn every control or bullet in one umbrella strategy into a
  separate event.
- Do not infer a purchase, vendor, amount, or stage that the document does not support.
- WORKSHOP is exploratory planning in a workshop or workshop attachment, including an
  explicit future plan to seek a vendor when no approval or solicitation occurred yet.
- AUTHORIZATION is approval to proceed, spend, contract, or issue a solicitation.
- SOLICITATION is an RFP, ITN, IFB, RFQ, or equivalent procurement action.
- AWARD is an actual vendor or contract award; RENEWAL is a renewal or extension.
- amount must be a number, a dollar string, or null.
- evidence must be one continuous passage copied character-for-character from DOCUMENT,
  including its original spelling. Never join separate passages. Keep it between 40 and
  220 characters so the factuality check can validate it.

DOCUMENT:
{excerpt}
""".strip()
    cache_key = sha1(
        EXTRACT_MODEL
        + "\x00"
        + PROMPT_VERSION
        + "\x00"
        + EXTRACT_VALIDATION_VERSION
        + "\x00"
        + excerpt
    )

    def compute() -> list[dict[str, Any]]:
        last_error: Exception | None = None
        for attempt in range(2):
            retry_note = "\nReturn only valid JSON with an events list. No markdown." if attempt else ""
            response = _client().responses.create(model=EXTRACT_MODEL, input=prompt + retry_note)
            try:
                return _validated_content_events(_parse_json(response.output_text), excerpt)
            except (json.JSONDecodeError, InvalidEventsPayload) as exc:
                last_error = exc
        assert last_error is not None
        raise last_error

    try:
        content_events = cached("extract", cache_key, compute)
    except (json.JSONDecodeError, InvalidEventsPayload) as exc:
        print(f"  warning: extraction returned invalid JSON twice: {exc}", file=sys.stderr)
        return []

    events: list[Event] = []
    for event_index, content in enumerate(content_events):
        grounded = _grounded_content_event(content, excerpt, event_index)
        if grounded is None:
            continue
        events.append(
            Event(
                district=str(row["district"]),
                meeting_date=str(row["meeting_date"]),
                source_type=str(row["source_type"]),
                url=str(row["url"]),
                initiative_name=grounded["initiative_name"],
                normalized_category=grounded["normalized_category"],
                state=grounded["state"],
                action=grounded["action"],
                vendor=grounded["vendor"],
                amount=grounded["amount"],
                summary=grounded["summary"],
                evidence=grounded["evidence"],
                source_row_index=int(row.get("source_row_index", 0)),
                event_index=event_index,
            )
        )
    return events


def signature(event: Event) -> str:
    return " | ".join(
        [event.initiative_name, event.normalized_category, event.vendor or "", event.summary]
    )


def embed_texts(texts: Iterable[str]) -> list[list[float]]:
    embeddings: list[list[float]] = []
    for text in texts:
        cache_key = sha1(EMBED_MODEL + "\x00" + text)

        def compute(current: str = text) -> list[float]:
            response = _client().embeddings.create(model=EMBED_MODEL, input=current)
            return list(response.data[0].embedding)

        embeddings.append([float(value) for value in cached("embed", cache_key, compute)])
    return embeddings


def cosine(a: list[float], b: list[float]) -> float:
    left = np.asarray(a, dtype=np.float32)
    right = np.asarray(b, dtype=np.float32)
    denominator = np.linalg.norm(left) * np.linalg.norm(right)
    return float(np.dot(left, right) / denominator) if denominator else 0.0


def _link_score(left: Event, right: Event) -> float:
    if left.district != right.district or not left.embedding or not right.embedding:
        return -1.0
    score = cosine(left.embedding, right.embedding)
    left_category = left.normalized_category.lower().strip()
    right_category = right.normalized_category.lower().strip()
    if left_category and right_category and (
        left_category == right_category
        or left_category in right_category
        or right_category in left_category
    ):
        score += 0.08
    if left.vendor and right.vendor and left.vendor.lower() == right.vendor.lower():
        score += 0.08
    return score


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "district"


def link_events(events: list[Event], threshold: float = 0.78) -> list[Event]:
    ordered = sorted(
        events,
        key=lambda event: (
            event.district,
            event.meeting_date,
            event.source_row_index,
            event.event_index,
        ),
    )
    clusters: dict[str, list[Event]] = {}
    district_counts: Counter[str] = Counter()

    for event in ordered:
        event.cluster_id = None
        best_cluster: str | None = None
        best_score = -1.0
        for cluster_id, members in clusters.items():
            if members[0].district != event.district:
                continue
            score = max((_link_score(event, member) for member in members[-3:]), default=-1.0)
            if score > best_score:
                best_score = score
                best_cluster = cluster_id

        if best_cluster is not None and best_score >= threshold:
            event.cluster_id = best_cluster
            clusters[best_cluster].append(event)
            continue

        number = district_counts[event.district]
        district_counts[event.district] += 1
        cluster_id = f"{_slug(event.district)}-{number}"
        event.cluster_id = cluster_id
        clusters[cluster_id] = [event]
    return ordered


def _clustered(events: Iterable[Event]) -> dict[str, list[Event]]:
    clusters: dict[str, list[Event]] = {}
    for event in events:
        if event.cluster_id:
            clusters.setdefault(event.cluster_id, []).append(event)
    for members in clusters.values():
        members.sort(
            key=lambda event: (event.meeting_date, event.source_row_index, event.event_index)
        )
    return clusters


def _most_common_latest(values: list[str]) -> str:
    nonempty = [value for value in values if value]
    if not nonempty:
        return ""
    counts = Counter(nonempty)
    highest = max(counts.values())
    candidates = {value for value, count in counts.items() if count == highest}
    return next(value for value in reversed(nonempty) if value in candidates)


def print_cluster_summary(events: list[Event]) -> None:
    for cluster_id, members in _clustered(events).items():
        initiative = _most_common_latest([event.initiative_name for event in members])
        category = _most_common_latest([event.normalized_category for event in members])
        states = "->".join(event.state for event in members)
        print(
            f"{cluster_id}: n={len(members)} dates={members[0].meeting_date}.."
            f"{members[-1].meeting_date} category={category} states={states} name={initiative}"
        )


def build_timelines(events: list[Event]) -> dict[str, dict[str, Any]]:
    timelines: dict[str, dict[str, Any]] = {}
    for cluster_id, members in _clustered(events).items():
        timelines[cluster_id] = {
            "district": members[0].district,
            "initiative_name": _most_common_latest(
                [event.initiative_name for event in members]
            ),
            "category": _most_common_latest(
                [event.normalized_category for event in members]
            ),
            "first_date": members[0].meeting_date,
            "last_date": members[-1].meeting_date,
            "events": [
                {
                    "date": event.meeting_date,
                    "state": event.state,
                    "action": event.action,
                    "vendor": event.vendor,
                    "amount": event.amount,
                    "summary": event.summary,
                    "evidence": event.evidence,
                    "url": event.url,
                    "source_type": event.source_type,
                }
                for event in members
            ],
        }
    return timelines


def _outcome_vectors(
    outcomes: pd.DataFrame,
    supplied: list[list[float]] | dict[int, list[float]] | None,
) -> list[list[float]]:
    if supplied is None:
        return embed_texts(
            f'{row["title"]} | {row["vendor"]}' for _, row in outcomes.iterrows()
        )
    if isinstance(supplied, dict):
        return [supplied[index] for index in range(len(outcomes))]
    return supplied


def match_outcomes(
    events: list[Event],
    outcomes: pd.DataFrame,
    match_threshold: float = 0.5,
    outcome_embeddings: list[list[float]] | dict[int, list[float]] | None = None,
) -> dict[str, dict[str, Any]]:
    outcomes = outcomes.reset_index(drop=True)
    vectors = _outcome_vectors(outcomes, outcome_embeddings)
    matches: dict[str, dict[str, Any]] = {}
    for cluster_id, members in _clustered(events).items():
        event_vectors = [event.embedding for event in members if event.embedding]
        cluster_vector = (
            np.mean(np.asarray(event_vectors, dtype=np.float32), axis=0).tolist()
            if event_vectors
            else []
        )
        best_index: int | None = None
        best_similarity = -1.0
        for index, row in outcomes.iterrows():
            if str(row["district"]) != members[0].district:
                continue
            similarity = cosine(cluster_vector, vectors[index]) if cluster_vector else 0.0
            if similarity > best_similarity:
                best_similarity = similarity
                best_index = index

        if best_index is None:
            matches[cluster_id] = {
                "matched": False,
                "similarity": None,
                "outcome_title": None,
                "outcome_type": None,
                "outcome_date": None,
                "outcome_url": None,
                "lead_days": None,
                "_outcome_index": None,
            }
            continue

        outcome = outcomes.iloc[best_index]
        earliest = pd.to_datetime(members[0].meeting_date, format="%Y-%m-%d")
        outcome_date = pd.to_datetime(outcome["outcome_date"], format="%Y-%m-%d")
        lead_days = int((outcome_date - earliest).days)
        matches[cluster_id] = {
            "matched": bool(best_similarity >= match_threshold and earliest < outcome_date),
            "similarity": round(best_similarity, 4),
            "outcome_title": str(outcome["title"]),
            "outcome_type": str(outcome["outcome_type"]),
            "outcome_date": str(outcome["outcome_date"]),
            "outcome_url": str(outcome["url"]),
            "lead_days": lead_days,
            "_outcome_index": best_index,
        }
    return matches


def evaluate(
    events: list[Event],
    timelines: dict[str, dict[str, Any]],
    outcomes: pd.DataFrame,
    sources: pd.DataFrame,
    threshold: float,
    match_threshold: float,
    outcome_embeddings: list[list[float]] | dict[int, list[float]] | None = None,
    labels: dict[tuple[str, str, str], str] | None = None,
) -> tuple[dict[str, dict[str, Any]], dict[str, Any], list[dict[str, Any]]]:
    matches = match_outcomes(events, outcomes, match_threshold, outcome_embeddings)
    covered_leads: list[int] = []
    for outcome_index in range(len(outcomes)):
        candidates = [
            match
            for match in matches.values()
            if match["matched"] and match["_outcome_index"] == outcome_index
        ]
        if candidates:
            best = max(candidates, key=lambda match: float(match["similarity"]))
            covered_leads.append(int(best["lead_days"]))

    source_districts = set(sources["district"].astype(str))
    outcome_districts = set(outcomes["district"].astype(str))
    control_districts = source_districts - outcome_districts
    clusters = _clustered(events)
    multi_event_controls = [
        members
        for members in clusters.values()
        if members[0].district in control_districts and len(members) >= 2
    ]
    firing_controls = {members[0].district for members in multi_event_controls}

    total_outcomes = len(outcomes)
    covered = len(covered_leads)
    median = float(np.median(covered_leads)) if covered_leads else None
    if median is not None and median.is_integer():
        median = int(median)

    labels = labels or {}
    pairs: list[dict[str, Any]] = []
    for cluster_id, timeline in timelines.items():
        match = matches[cluster_id]
        label_key = (
            cluster_id,
            str(match["outcome_title"] or ""),
            str(match["outcome_date"] or ""),
        )
        pairs.append(
            {
                "district": timeline["district"],
                "cluster_id": cluster_id,
                "initiative_name": timeline["initiative_name"],
                "first_event_date": timeline["first_date"],
                "n_events": len(timeline["events"]),
                "outcome_title": match["outcome_title"] or "",
                "outcome_date": match["outcome_date"] or "",
                "similarity": "" if match["similarity"] is None else match["similarity"],
                "lead_days": "" if match["lead_days"] is None else match["lead_days"],
                "matched": match["matched"],
                "label": labels.get(label_key, ""),
            }
        )

    normalized_labels = [str(pair["label"]).strip().lower() for pair in pairs]
    labeled = sum(label in {"correct", "incorrect"} for label in normalized_labels)
    correct = sum(label == "correct" for label in normalized_labels)
    metrics = {
        "n_docs": len(sources),
        "n_events": len(events),
        "n_clusters": len(timelines),
        "coverage": {
            "covered": covered,
            "total": total_outcomes,
            "rate": covered / total_outcomes if total_outcomes else 0.0,
        },
        "median_lead_days": median,
        "control_fp": {
            "firing_districts": len(firing_controls),
            "control_districts": len(control_districts),
            "rate": len(firing_controls) / len(control_districts) if control_districts else 0.0,
            "n_multi_event_clusters": len(multi_event_controls),
        },
        "precision": {
            "correct": correct,
            "labeled": labeled,
            "rate": correct / labeled if labeled else None,
        },
        "threshold": threshold,
        "match_threshold": match_threshold,
    }
    public_matches = {
        cluster_id: {key: value for key, value in match.items() if not key.startswith("_")}
        for cluster_id, match in matches.items()
    }
    return public_matches, metrics, pairs


def write_json(path: str | Path, value: Any) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def write_csv(
    path: str | Path,
    rows: list[dict[str, Any]],
    columns: list[str] | None = None,
) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows, columns=columns).to_csv(output_path, index=False)


def _event_json(event: Event, include_cluster: bool) -> dict[str, Any]:
    data = asdict(event)
    data.pop("source_row_index")
    data.pop("event_index")
    if not include_cluster:
        data.pop("cluster_id")
    return data


def _load_event_document(path: Path) -> tuple[dict[str, Any], list[Event]]:
    if not path.exists():
        raise SystemExit(f"Missing {path}; run extract first")
    document = json.loads(path.read_text(encoding="utf-8"))
    raw_events = document.get("events")
    if not isinstance(raw_events, list):
        raise SystemExit(f"{path} has no events list")
    events: list[Event] = []
    for order, raw in enumerate(raw_events):
        event_data = {field: raw.get(field) for field in EVENT_FIELDS}
        event_data["embedding"] = raw.get("embedding")
        event_data["cluster_id"] = raw.get("cluster_id")
        event_data["source_row_index"] = order
        event_data["event_index"] = 0
        events.append(Event(**event_data))
    return document, events


def _outdir(path: str | Path) -> Path:
    output = Path(path)
    return output if output.is_absolute() else ROOT / output


def _run_fetch(sources_path: str) -> None:
    sources = load_sources(sources_path)
    failures = 0
    for index, row in sources.iterrows():
        try:
            text = fetch_text(row)
        except Exception as exc:
            failures += 1
            print(f"[{index + 1}/{len(sources)}] fetch failed: {exc}", file=sys.stderr)
            continue
        relevant = keyword_relevant(text)
        warning = (
            " WARNING: under 500 chars; document may be scanned or not fully rendered"
            if len(text) < 500
            else ""
        )
        print(
            f"[{index + 1}/{len(sources)}] {row['district']} {row['meeting_date']}: "
            f"chars={len(text)} keyword-relevant={'y' if relevant else 'n'}{warning}"
        )
    if failures:
        raise SystemExit(f"fetch completed with {failures} failed source(s)")


def _run_extract(sources_path: str, outdir: str) -> None:
    sources = load_sources(sources_path)
    if not sources.empty and not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is required to extract non-empty sources")
    events: list[Event] = []
    for index, row in sources.iterrows():
        print(f"[{index + 1}/{len(sources)}] {row['district']} {row['meeting_date']}")
        try:
            text = fetch_text(row)
        except Exception as exc:
            print(f"  fetch failed: {exc}", file=sys.stderr)
            continue
        if not keyword_relevant(text):
            print("  skipped: no cyber keywords")
            continue
        try:
            extracted = extract_events(text, row)
            vectors = embed_texts(signature(event) for event in extracted)
        except Exception as exc:
            print(f"  extraction failed: {exc}", file=sys.stderr)
            continue
        for event, vector in zip(extracted, vectors, strict=True):
            event.embedding = vector
            events.append(event)
            print(f"  kept: {event.state} | {event.initiative_name}")
        if not extracted:
            print("  skipped: no procurement events")

    document = {
        "model": EXTRACT_MODEL,
        "prompt_version": PROMPT_VERSION,
        "validation_version": EXTRACT_VALIDATION_VERSION,
        "generated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "events": [_event_json(event, include_cluster=False) for event in events],
    }
    if not sources.empty and not events:
        print(
            "warning: non-empty sources produced zero extracted events",
            file=sys.stderr,
        )
    output = _outdir(outdir)
    write_json(output / "events.json", document)
    print(f"Wrote {output / 'events.json'} ({len(events)} events)")


def _run_link(outdir: str, threshold: float) -> None:
    output = _outdir(outdir)
    document, events = _load_event_document(output / "events.json")
    linked = link_events(events, threshold)
    document["link_threshold"] = threshold
    document["events"] = [_event_json(event, include_cluster=True) for event in linked]
    write_json(output / "events.json", document)
    write_csv(
        output / "events.csv",
        [
            {
                key: value
                for key, value in asdict(event).items()
                if key not in {"embedding", "source_row_index", "event_index"}
            }
            for event in linked
        ],
        EVENT_FIELDS + ["cluster_id"],
    )
    timelines = build_timelines(linked)
    write_json(output / "timelines.json", timelines)
    print_cluster_summary(linked)
    print(f"Wrote {output / 'events.csv'} and {output / 'timelines.json'}")


def _existing_labels(path: Path) -> dict[tuple[str, str, str], str]:
    if not path.exists():
        return {}
    existing = pd.read_csv(path, dtype=str, keep_default_na=False)
    needed = {"cluster_id", "outcome_title", "outcome_date", "label"}
    if not needed.issubset(existing.columns):
        return {}
    return {
        (row["cluster_id"], row["outcome_title"], row["outcome_date"]): row["label"]
        for _, row in existing.iterrows()
    }


def _run_eval(
    sources_path: str,
    outcomes_path: str,
    outdir: str,
    match_threshold: float,
) -> None:
    output = _outdir(outdir)
    document, events = _load_event_document(output / "events.json")
    threshold = float(document.get("link_threshold", 0.78))
    timelines_path = output / "timelines.json"
    if not timelines_path.exists():
        raise SystemExit(f"Missing {timelines_path}; run link first")
    timelines = json.loads(timelines_path.read_text(encoding="utf-8"))
    event_cluster_ids = {event.cluster_id for event in events if event.cluster_id}
    timeline_cluster_ids = set(timelines)
    if (
        any(event.cluster_id is None for event in events)
        or event_cluster_ids != timeline_cluster_ids
    ):
        raise SystemExit("link artifacts are stale or mismatched; run link first")
    sources = load_sources(sources_path)
    outcomes = load_outcomes(outcomes_path)
    labels = _existing_labels(output / "linked_pairs.csv")
    comparison, metrics, pairs = evaluate(
        events,
        timelines,
        outcomes,
        sources,
        threshold,
        match_threshold,
        labels=labels,
    )
    write_json(output / "comparison.json", comparison)
    write_json(output / "metrics.json", metrics)
    pair_columns = [
        "district",
        "cluster_id",
        "initiative_name",
        "first_event_date",
        "n_events",
        "outcome_title",
        "outcome_date",
        "similarity",
        "lead_days",
        "matched",
        "label",
    ]
    write_csv(output / "linked_pairs.csv", pairs, pair_columns)
    print(json.dumps(metrics, indent=2))
    print("Wrote comparison.json, metrics.json, and linked_pairs.csv")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in ("fetch", "extract", "link", "eval", "all"):
        subparser = subparsers.add_parser(command)
        subparser.add_argument("--sources", default="data/sources.csv")
        subparser.add_argument("--outcomes", default="data/outcomes.csv")
        subparser.add_argument("--outdir", default="out")
        if command in {"link", "all"}:
            subparser.add_argument("--threshold", type=float, default=0.78)
        if command in {"eval", "all"}:
            subparser.add_argument("--match-threshold", type=float, default=0.5)
    return parser


def main() -> None:
    args = _parser().parse_args()
    if args.command == "fetch":
        _run_fetch(args.sources)
    elif args.command == "extract":
        _run_extract(args.sources, args.outdir)
    elif args.command == "link":
        _run_link(args.outdir, args.threshold)
    elif args.command == "eval":
        _run_eval(
            args.sources,
            args.outcomes,
            args.outdir,
            args.match_threshold,
        )
    else:
        _run_fetch(args.sources)
        _run_extract(args.sources, args.outdir)
        _run_link(args.outdir, args.threshold)
        _run_eval(
            args.sources,
            args.outcomes,
            args.outdir,
            args.match_threshold,
        )


if __name__ == "__main__":
    main()
