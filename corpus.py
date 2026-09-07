# /// script
# requires-python = ">=3.13"
# dependencies = ["requests", "beautifulsoup4", "numpy", "pandas"]
# ///
"""Acquire the statewide corpus that trajectory.py evaluates.

Stages:
  meetings  index every BoardDocs district's meetings into data/meetings.csv
  outcomes  pull Florida school-district firewall Form 470s from USAC open data
  cases     build the holdout ledger, outcomes, and sources under data/holdout/
  board     build the current-window sources under data/board/
  packets   warm trajectory.py's fetch cache with plain HTTP (no browser)

trajectory.py is not modified by any of this; the model, prompt, and thresholds stay
frozen and this file only writes their inputs.
"""

from __future__ import annotations

import argparse
import calendar
import csv
import json
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import requests

import trajectory

ROOT = Path(__file__).resolve().parent
DISTRICTS = ROOT / "data" / "districts.csv"
MEETINGS = ROOT / "data" / "meetings.csv"
USAC_ROWS = ROOT / "data" / "usac_firewall_470.csv"
HOLDOUT_DIR = ROOT / "data" / "holdout"
BOARD_DIR = ROOT / "data" / "board"

BOARDDOCS = "https://go.boarddocs.com"
USAC_RESOURCE = "https://opendata.usac.org/resource/jt8s-3q52.json"
HEADERS = {
    "User-Agent": trajectory.HTTP_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
WINDOW_MONTHS = 18
# ponytail: a case needs this many in-window meetings before "no signal" means anything.
MIN_WINDOW_MEETINGS = 8
POLITE_DELAY_SECONDS = 0.75  # BoardDocs throttled a faster crawl with 403s
SOURCE_TYPE = "board_agenda_packet"

DISTRICT_FIELDS = ("county", "district", "boarddocs_site", "portal", "evidence_url", "notes")
MEETING_FIELDS = ("district", "meeting_date", "meeting_name", "meeting_id", "url")
USAC_FIELDS = (
    "application_number",
    "billed_entity_number",
    "billed_entity_name",
    "district",
    "funding_year",
    "certified_date",
    "function",
    "service_type",
    "form_pdf",
    "rfp_url",
)
CASE_FIELDS = (
    "case_id",
    "role",
    "district",
    "index_date",
    "outcome_type",
    "outcome_id",
    "title",
    "vendor",
    "amount",
    "outcome_url",
    "window_start",
    "window_end",
    "portal_type",
    "enrollment",
    "matched_case_id",
    "research_status",
)
OUTCOME_FIELDS = ("district", "outcome_date", "outcome_type", "title", "vendor", "url")
SOURCE_FIELDS = ("district", "meeting_date", "source_type", "url")
LEDGER_FIELDS = ("district", "meeting_date", "url", "status", "chars")

# USAC bills a county district under several spellings; the county is the join key.
COUNTY_ALIASES = {
    "miami-dade": ["miami dade", "dade"],
    "st. johns": ["st johns", "saint johns"],
    "st. lucie": ["st lucie", "saint lucie"],
    "desoto": ["desoto", "de soto"],
}
DISTRICT_MARKERS = ("school", "district", "board of public instruction", "county public")
NON_DISTRICT_MARKERS = (
    "charter",
    "academy",
    " inc",
    "diocese",
    "kipp",
    "idea ",
    "corp",
    "llc",
    "prep",
    "christian",
    "catholic",
    "foundation",
    "institute",
    "learning center",
)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def write_csv(path: Path, rows: list[dict[str, object]], fields: tuple[str, ...]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(fields), lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def months_before(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 - months
    year, zero_based_month = divmod(month_index, 12)
    month = zero_based_month + 1
    return date(year, month, min(value.day, calendar.monthrange(year, month)[1]))


def iso(value: date) -> str:
    return value.isoformat()


def get(url: str, *, attempts: int = 4, timeout: int = 60, **kwargs: object) -> requests.Response:
    """GET with browser headers. BoardDocs answers 403 when it throttles, so 403 waits like 429."""
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            response = requests.get(url, headers=HEADERS, timeout=timeout, **kwargs)
            if response.status_code in (403, 429):
                wait = 30 * 2**attempt
                print(f"  throttled (HTTP {response.status_code}); waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
                raise RuntimeError(f"HTTP {response.status_code}")
            if response.status_code in (500, 502, 503, 504):
                raise RuntimeError(f"HTTP {response.status_code}")
            return response
        except (requests.RequestException, RuntimeError) as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"{url}: {last}")


def boarddocs_districts() -> list[dict[str, str]]:
    return [row for row in read_csv(DISTRICTS) if row.get("boarddocs_site", "").strip()]


# --- meetings ---------------------------------------------------------------


def _meeting_list(site: str, refresh: bool) -> list[dict[str, object]]:
    key = trajectory.sha1(site)
    cache_file = trajectory.CACHE_DIR / "meetings" / f"{key}.json"
    if refresh and cache_file.exists():
        cache_file.unlink()

    def compute() -> list[dict[str, object]]:
        url = f"{BOARDDOCS}/{site}/Board.nsf/BD-GETMeetingsListForSEO?open"
        response = get(url)
        if not response.ok:
            raise RuntimeError(f"HTTP {response.status_code} for {url}")
        payload = response.json()
        if not isinstance(payload, list):
            raise RuntimeError(f"unexpected meeting list payload for {site}")
        if payload:
            return payload
        # Some sites publish nothing on the SEO list; ask the board's committee list instead.
        html = get(f"{BOARDDOCS}/{site}/Board.nsf/Public").text
        committee = re.search(r'<option[^>]*value="([A-Z0-9]{12})"', html)
        if committee is None:
            return payload
        listed = requests.post(
            f"{BOARDDOCS}/{site}/Board.nsf/BD-GetMeetingsList?open",
            headers=HEADERS,
            data={"current_committee_id": committee.group(1)},
            timeout=60,
        )
        if not listed.ok:
            raise RuntimeError(f"HTTP {listed.status_code} for the committee meeting list of {site}")
        # Normalise to the SEO shape: Unique + ISO Date.
        return [
            {
                "Name": item.get("name", ""),
                "Unique": item.get("unique", ""),
                "Date": f"{str(item.get('numberdate', ''))[:4]}-{str(item.get('numberdate', ''))[4:6]}-{str(item.get('numberdate', ''))[6:8]}T00:00:00Z",
            }
            for item in listed.json()
            if isinstance(item, dict)
        ]

    return list(trajectory.cached("meetings", key, compute))


def _portal_title(site: str) -> str:
    """The site's title plus its first board name; addresses and generic names are common."""

    def compute() -> str:
        html = get(f"{BOARDDOCS}/{site}/Board.nsf/Public").text
        title = re.search(r"<title>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
        board = re.search(r'<option[^>]*value="[A-Z0-9]{12}"[^>]*>([^<]*)', html)
        parts = [trajectory.clean_text(match.group(1)) for match in (title, board) if match]
        return " / ".join(part for part in parts if part)

    return str(trajectory.cached("portal_title", trajectory.sha1(site), compute))


def _looks_like_school_board(site: str, title: str, meetings: list[dict[str, object]]) -> bool:
    """BoardDocs also hosts county commissions; a school board's packets mention the superintendent."""
    names = " ".join(str(meeting.get("Name", "")) for meeting in meetings)
    if re.search(r"school|superintendent", f"{title} {names}", flags=re.IGNORECASE):
        return True
    if re.search(r"commission|city council|county council", names, flags=re.IGNORECASE):
        return False
    latest = next(
        (meeting for meeting in meetings if re.fullmatch(r"[A-Z0-9]{12}", str(meeting.get("Unique", "")))),
        None,
    )
    if latest is None:
        return False
    url = f"{BOARDDOCS}/{site}/Board.nsf/Download-AgendaDetailed?open&id={latest['Unique']}"
    text = str(trajectory.cached("fetch", trajectory.sha1(f"{trajectory.FETCH_VERSION}:{url}"), lambda: packet_text(url)))
    return re.search(r"superintendent|school board", text, flags=re.IGNORECASE) is not None


def run_meetings(refresh: bool) -> None:
    rows: list[dict[str, object]] = []
    failures: list[str] = []
    for district in boarddocs_districts():
        site = district["boarddocs_site"].strip().strip("/")
        name = district["district"].strip()
        try:
            listed = _meeting_list(site, refresh)
            title = _portal_title(site)
        except Exception as exc:
            failures.append(f"{name} ({site}): {exc}")
            print(f"{name}: FAILED {exc}", file=sys.stderr)
            continue
        if not _looks_like_school_board(site, title, listed):
            failures.append(f"{name} ({site}): does not look like a school board: {title!r}")
            print(f"{name}: SKIPPED, {site} does not look like a school board ({title!r})", file=sys.stderr)
            continue
        kept = 0
        dates: list[str] = []
        for meeting in listed:
            unique = str(meeting.get("Unique", "")).strip()
            raw_date = str(meeting.get("Date", ""))[:10]
            if not re.fullmatch(r"[A-Z0-9]{12}", unique) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_date):
                continue
            if not 2015 <= int(raw_date[:4]) <= date.today().year + 1:
                continue
            rows.append(
                {
                    "district": name,
                    "meeting_date": raw_date,
                    "meeting_name": trajectory.clean_text(str(meeting.get("Name", ""))),
                    "meeting_id": unique,
                    "url": f"{BOARDDOCS}/{site}/Board.nsf/Download-AgendaDetailed?open&id={unique}",
                }
            )
            kept += 1
            dates.append(raw_date)
        span = f"{min(dates)}..{max(dates)}" if dates else "no dates"
        print(f"{name}: {kept} meetings ({span}) - portal: {title}")
    rows.sort(key=lambda row: (str(row["district"]), str(row["meeting_date"]), str(row["meeting_id"])))
    write_csv(MEETINGS, rows, MEETING_FIELDS)
    print(f"\nwrote {len(rows)} meetings for {len({row['district'] for row in rows})} districts to {MEETINGS}")
    if failures:
        print(f"{len(failures)} districts failed:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)


# --- outcomes ---------------------------------------------------------------


def _normalize(text: str) -> str:
    return " " + re.sub(r"[^a-z0-9]+", " ", text.lower()).strip() + " "


def match_district(entity_name: str, districts: list[dict[str, str]]) -> str:
    """Map a USAC billed-entity name to a registry district by county phrase."""
    normalized = _normalize(entity_name)
    if not any(marker in normalized for marker in DISTRICT_MARKERS):
        return ""
    if any(marker in normalized for marker in NON_DISTRICT_MARKERS):
        return ""
    best = ""
    best_length = 0
    for row in districts:
        county = row["county"].strip().lower()
        phrases = [county, *COUNTY_ALIASES.get(county, [])]
        for phrase in phrases:
            needle = _normalize(phrase)
            if needle in normalized and len(needle) > best_length:
                best = row["district"].strip()
                best_length = len(needle)
    return best


def _usac_query(params: dict[str, str]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    offset = 0
    while True:
        page = dict(params, **{"$limit": "5000", "$offset": str(offset)})
        response = get(f"{USAC_RESOURCE}?{urlencode(page)}", timeout=120)
        if not response.ok:
            raise RuntimeError(f"USAC HTTP {response.status_code}: {response.text[:300]}")
        batch = response.json()
        rows.extend(batch)
        if len(batch) < 5000:
            return rows
        offset += 5000


def run_outcomes() -> None:
    districts = read_csv(DISTRICTS)
    raw = _usac_query(
        {
            "$select": ",".join(
                [
                    "application_number",
                    "billed_entity_number",
                    "billed_entity_name",
                    "funding_year",
                    "certified_date_time",
                    "function",
                    "service_type",
                    "form_pdf",
                    "rfp_documents",
                ]
            ),
            "$where": (
                "billed_entity_state='FL' AND applicant_type='School District' "
                "AND upper(function) LIKE '%FIREWALL%' AND funding_year>='2019'"
            ),
            "$order": "certified_date_time,application_number",
        }
    )
    rows: list[dict[str, object]] = []
    unmapped: Counter[str] = Counter()
    for item in raw:
        name = str(item.get("billed_entity_name", "")).strip()
        district = match_district(name, districts)
        if not district:
            unmapped[name] += 1
        certified = str(item.get("certified_date_time", ""))[:10]
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", certified):
            continue
        rows.append(
            {
                "application_number": item.get("application_number", ""),
                "billed_entity_number": item.get("billed_entity_number", ""),
                "billed_entity_name": name,
                "district": district,
                "funding_year": item.get("funding_year", ""),
                "certified_date": certified,
                "function": item.get("function", ""),
                "service_type": item.get("service_type", ""),
                "form_pdf": (item.get("form_pdf") or {}).get("url", "") if isinstance(item.get("form_pdf"), dict) else "",
                "rfp_url": (item.get("rfp_documents") or {}).get("url", "") if isinstance(item.get("rfp_documents"), dict) else "",
            }
        )
    write_csv(USAC_ROWS, rows, USAC_FIELDS)
    mapped = sum(1 for row in rows if row["district"])
    print(f"wrote {len(rows)} firewall Form 470 rows ({mapped} mapped to a registry district) to {USAC_ROWS}")
    if unmapped:
        print(f"{len(unmapped)} billed entities were not mapped (charters and non-county entities expected):")
        for name, count in unmapped.most_common():
            print(f"  {count:>4}  {name}")


# --- cases ------------------------------------------------------------------


def _meetings_by_district() -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in read_csv(MEETINGS):
        grouped[row["district"]].append(row)
    return grouped


def _in_window(meetings: list[dict[str, str]], start: date, end: date) -> list[dict[str, str]]:
    return [row for row in meetings if iso(start) <= row["meeting_date"] <= iso(end)]


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def build_cases(
    usac_rows: list[dict[str, str]],
    districts: list[dict[str, str]],
    meetings: dict[str, list[dict[str, str]]],
    from_fy: int,
    to_fy: int,
) -> list[dict[str, object]]:
    """Positive case per (district, funding year) with a firewall Form 470; one matched control each."""
    eligible = {row["district"].strip() for row in districts}
    filings: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    all_dates: dict[str, list[date]] = defaultdict(list)
    for row in usac_rows:
        district = row["district"].strip()
        if district not in eligible:
            continue
        certified = date.fromisoformat(row["certified_date"])
        all_dates[district].append(certified)
        filings[(district, row["funding_year"])].append(row)

    cases: list[dict[str, object]] = []
    control_use: Counter[str] = Counter()
    for (district, funding_year) in sorted(filings, key=lambda key: (key[1], key[0])):
        if not from_fy <= int(funding_year) <= to_fy:
            continue
        rows = sorted(filings[(district, funding_year)], key=lambda row: row["certified_date"])
        first = rows[0]
        index_date = date.fromisoformat(first["certified_date"])
        window_start = months_before(index_date, WINDOW_MONTHS)
        window_end = index_date - timedelta(days=1)
        in_window = _in_window(meetings.get(district, []), window_start, window_end)
        case_id = f"{_slug(district)}_fy{funding_year}"
        status = "complete" if len(in_window) >= MIN_WINDOW_MEETINGS else "insufficient_sources"
        cases.append(
            {
                "case_id": case_id,
                "role": "positive",
                "district": district,
                "index_date": iso(index_date),
                "outcome_type": "FORM_470",
                "outcome_id": first["application_number"],
                "title": first["function"],
                "vendor": "",
                "amount": "",
                "outcome_url": first["form_pdf"] or first["rfp_url"],
                "window_start": iso(window_start),
                "window_end": iso(window_end),
                "portal_type": "boarddocs",
                "enrollment": "",
                "matched_case_id": "",
                "research_status": status,
            }
        )
        if status != "complete":
            continue

        # Control: a BoardDocs district with no firewall filing from the window start
        # through a year after the index date, enough in-window meetings, least reused.
        quiet_until = index_date + timedelta(days=365)
        candidates = []
        for other in sorted(eligible):
            if other == district:
                continue
            if any(window_start <= filed <= quiet_until for filed in all_dates.get(other, [])):
                continue
            if len(_in_window(meetings.get(other, []), window_start, window_end)) < MIN_WINDOW_MEETINGS:
                continue
            candidates.append(other)
        if not candidates:
            continue
        control = min(candidates, key=lambda name: (control_use[name], name))
        control_use[control] += 1
        cases.append(
            {
                "case_id": f"control_{_slug(control)}_{case_id}",
                "role": "control",
                "district": control,
                "index_date": iso(index_date),
                "window_start": iso(window_start),
                "window_end": iso(window_end),
                "portal_type": "boarddocs",
                "matched_case_id": case_id,
                "research_status": "complete",
            }
        )
    return cases


def case_label(case: dict[str, object]) -> str:
    """The district field trajectory.py sees; one case is one evaluation unit (ASCII for logs)."""
    fy = str(case["case_id"]).rsplit("fy", 1)[-1]
    role = "control FY" if case["role"] == "control" else "FY"
    return f"{case['district']} | {role} {fy}"


def run_cases(from_fy: int, to_fy: int) -> None:
    usac_rows = read_csv(USAC_ROWS)
    districts = boarddocs_districts()
    meetings = _meetings_by_district()
    cases = build_cases(usac_rows, districts, meetings, from_fy, to_fy)
    write_csv(HOLDOUT_DIR / "cases.csv", cases, CASE_FIELDS)

    outcomes: list[dict[str, object]] = []
    sources: list[dict[str, object]] = []
    for case in cases:
        if case["research_status"] != "complete":
            continue
        label = case_label(case)
        if case["role"] == "positive":
            outcomes.append(
                {
                    "district": label,
                    "outcome_date": case["index_date"],
                    "outcome_type": case["outcome_type"],
                    "title": case["title"],
                    "vendor": "",
                    "url": case["outcome_url"],
                }
            )
        start = date.fromisoformat(str(case["window_start"]))
        end = date.fromisoformat(str(case["window_end"]))
        for meeting in _in_window(meetings.get(str(case["district"]), []), start, end):
            sources.append(
                {
                    "district": label,
                    "meeting_date": meeting["meeting_date"],
                    "source_type": SOURCE_TYPE,
                    "url": meeting["url"],
                }
            )
    write_csv(HOLDOUT_DIR / "outcomes.csv", outcomes, OUTCOME_FIELDS)
    write_csv(HOLDOUT_DIR / "sources.csv", sources, SOURCE_FIELDS)

    roles = Counter((case["role"], case["research_status"]) for case in cases)
    print(f"cases: {dict(roles)}")
    print(f"outcomes: {len(outcomes)} - source rows: {len(sources)} - unique packets: {len({row['url'] for row in sources})}")
    print(f"wrote {HOLDOUT_DIR / 'cases.csv'}, outcomes.csv, sources.csv")


# --- board ------------------------------------------------------------------


def run_board(months: int) -> None:
    today = date.today()
    start = months_before(today, months)
    meetings = _meetings_by_district()
    sources: list[dict[str, object]] = []
    for district in boarddocs_districts():
        name = district["district"].strip()
        for meeting in _in_window(meetings.get(name, []), start, today):
            sources.append(
                {
                    "district": name,
                    "meeting_date": meeting["meeting_date"],
                    "source_type": SOURCE_TYPE,
                    "url": meeting["url"],
                }
            )
    write_csv(BOARD_DIR / "sources.csv", sources, SOURCE_FIELDS)
    write_csv(BOARD_DIR / "outcomes.csv", [], OUTCOME_FIELDS)
    print(f"board window {iso(start)}..{iso(today)}: {len(sources)} packets across {len({row['district'] for row in sources})} districts")


# --- packets ----------------------------------------------------------------


def packet_text(url: str) -> str:
    from bs4 import BeautifulSoup

    response = get(url)
    if not response.ok:
        raise RuntimeError(f"HTTP {response.status_code}")
    content_type = response.headers.get("content-type", "").lower()
    if "application/pdf" in content_type or response.content.lstrip().startswith(b"%PDF-"):
        return trajectory._pdf_text(response.content)
    return trajectory.clean_text(BeautifulSoup(response.text, "html.parser").get_text(" "))


def run_packets(source_files: list[str]) -> None:
    counts: Counter[str] = Counter()
    total_chars = 0
    total_unique = 0
    for source_file in source_files:
        path = Path(source_file)
        rows = read_csv(path if path.is_absolute() else ROOT / path)
        # One ledger per sources file; a packet shared with an earlier file is a cache hit.
        seen: set[str] = set()
        ledger: list[dict[str, object]] = []
        for index, row in enumerate(rows, start=1):
            url = row["url"].strip()
            if url in seen or not url.startswith("http"):
                continue
            seen.add(url)
            key = trajectory.sha1(f"{trajectory.FETCH_VERSION}:{url}")
            cache_file = trajectory.CACHE_DIR / "fetch" / f"{key}.json"
            if cache_file.exists():
                text = str(json.loads(cache_file.read_text(encoding="utf-8")))
                status = "cached"
            else:
                try:
                    text = str(trajectory.cached("fetch", key, lambda current=url: packet_text(current)))
                    status = "fetched"
                except Exception as exc:
                    text = ""
                    status = f"failed: {exc}"
                    print(f"  [{index}/{len(rows)}] FAILED {url}: {exc}", file=sys.stderr)
                time.sleep(POLITE_DELAY_SECONDS)
            counts[status.split(":")[0]] += 1
            total_chars += len(text)
            ledger.append(
                {
                    "district": row["district"],
                    "meeting_date": row["meeting_date"],
                    "url": url,
                    "status": status,
                    "chars": len(text),
                }
            )
            if status == "fetched" and len(seen) % 25 == 0:
                print(f"  [{len(seen)} packets] fetched={counts['fetched']} cached={counts['cached']} failed={counts['failed']}")
        write_csv((path if path.is_absolute() else ROOT / path).with_name("crawl_ledger.csv"), ledger, LEDGER_FIELDS)
        total_unique += len(seen)
        short = sum(1 for row in ledger if not str(row["status"]).startswith("failed") and int(str(row["chars"])) < 500)
        print(f"{path}: {len(seen)} unique packets - {short} under 500 chars")
    print(
        f"packets: {total_unique} - fetched {counts['fetched']} - cached {counts['cached']} - "
        f"failed {counts['failed']} - {total_chars:,} chars"
    )


# --- stats ------------------------------------------------------------------


def _cached_text(url: str) -> str:
    key = trajectory.sha1(f"{trajectory.FETCH_VERSION}:{url}")
    path = trajectory.CACHE_DIR / "fetch" / f"{key}.json"
    return str(json.loads(path.read_text(encoding="utf-8"))) if path.exists() else ""


def run_stats() -> None:
    """Write data/pipeline_stats.json: what was crawled and what will reach the model."""
    districts = read_csv(DISTRICTS)
    portals: Counter[str] = Counter()
    for row in districts:
        if row["boarddocs_site"].strip():
            portals["boarddocs"] += 1
        elif row["portal"].strip().lower() in ("", "unknown"):
            portals["unknown"] += 1
        else:
            portals["other"] += 1
    meetings = read_csv(MEETINGS) if MEETINGS.exists() else []
    dates = sorted(row["meeting_date"] for row in meetings)

    runs: dict[str, dict[str, object]] = {}
    for name, directory in (("holdout", HOLDOUT_DIR), ("board", BOARD_DIR)):
        ledger_path = directory / "crawl_ledger.csv"
        if not ledger_path.exists():
            continue
        ledger = read_csv(ledger_path)
        relevant = clipped = short = 0
        for row in ledger:
            if row["status"].startswith("failed"):
                continue
            text = _cached_text(row["url"])
            if len(text) < 500:
                short += 1
            if trajectory.keyword_relevant(text):
                relevant += 1
                clipped += len(trajectory.clip_windows(text))
        runs[name] = {
            "source_rows": len(read_csv(directory / "sources.csv")),
            "unique_packets": len(ledger),
            "fetched": sum(1 for row in ledger if not row["status"].startswith("failed")),
            "failed": sum(1 for row in ledger if row["status"].startswith("failed")),
            "short": short,
            "chars": sum(int(row["chars"]) for row in ledger),
            "keyword_relevant": relevant,
            "clipped_chars": clipped,
            "approx_input_tokens": clipped // 4,
        }

    stats = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "districts": {"total": len(districts), **portals},
        "meetings": len(meetings),
        "meetings_span": [dates[0], dates[-1]] if dates else None,
        "runs": runs,
    }
    path = ROOT / "data" / "pipeline_stats.json"
    path.write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(stats, indent=2))


# --- cli --------------------------------------------------------------------


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    subparsers = parser.add_subparsers(dest="stage", required=True)
    meetings = subparsers.add_parser("meetings", help="index BoardDocs meetings")
    meetings.add_argument("--refresh", action="store_true", help="refetch cached meeting lists")
    subparsers.add_parser("outcomes", help="pull firewall Form 470s from USAC")
    cases = subparsers.add_parser("cases", help="build the holdout ledger")
    cases.add_argument("--from-fy", type=int, default=2025)
    cases.add_argument("--to-fy", type=int, default=2026)
    board = subparsers.add_parser("board", help="build the current-window sources")
    board.add_argument("--months", type=int, default=WINDOW_MONTHS)
    packets = subparsers.add_parser("packets", help="warm the fetch cache")
    packets.add_argument("--sources", action="append", required=True, help="sources CSV (repeatable)")
    subparsers.add_parser("stats", help="write data/pipeline_stats.json")
    return parser


def main() -> None:
    sys.stdout.reconfigure(line_buffering=True)  # progress lines show up when redirected
    args = _parser().parse_args()
    if args.stage == "meetings":
        run_meetings(args.refresh)
    elif args.stage == "outcomes":
        run_outcomes()
    elif args.stage == "cases":
        run_cases(args.from_fy, args.to_fy)
    elif args.stage == "board":
        run_board(args.months)
    elif args.stage == "packets":
        run_packets(args.sources)
    elif args.stage == "stats":
        run_stats()


if __name__ == "__main__":
    main()
