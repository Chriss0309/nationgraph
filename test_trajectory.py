# /// script
# requires-python = ">=3.13"
# dependencies = ["numpy", "pandas"]
# ///
"""Offline assertions for the procurement trajectory pipeline."""

from __future__ import annotations

import io
import json
import math
import os
import random
import sys
import tempfile
import types
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch

import pandas as pd

import trajectory
from trajectory import Event


def unit(angle_degrees: float) -> list[float]:
    angle = math.radians(angle_degrees)
    return [math.cos(angle), math.sin(angle)]


def make_event(
    name: str,
    vector: list[float],
    *,
    district: str = "Hillsview",
    date: str = "2025-01-01",
    category: str = "",
    vendor: str | None = None,
    source_row_index: int = 0,
    event_index: int = 0,
) -> Event:
    return Event(
        district=district,
        meeting_date=date,
        source_type="minutes",
        url=f"fixture://{name}",
        initiative_name=name,
        normalized_category=category,
        state="DISCUSSION",
        action=name,
        vendor=vendor,
        amount=None,
        summary=name,
        evidence=name,
        embedding=vector,
        source_row_index=source_row_index,
        event_index=event_index,
    )


def cluster_ids(events: list[Event]) -> set[str | None]:
    return {event.cluster_id for event in events}


def test_linker() -> None:
    close = [
        make_event("one", unit(0), date="2025-01-01", source_row_index=0),
        make_event("two", unit(10), date="2025-02-01", source_row_index=1),
        make_event("three", unit(20), date="2025-03-01", source_row_index=2),
    ]
    assert len(cluster_ids(trajectory.link_events(close, threshold=0.78))) == 1

    orthogonal = [
        make_event("north", unit(0), category="SIEM", source_row_index=0),
        make_event("east", unit(90), category="SIEM", source_row_index=1),
    ]
    assert len(cluster_ids(trajectory.link_events(orthogonal, threshold=0.78))) == 2

    bonus_angle = math.degrees(math.acos(0.72))
    same_category = [
        make_event("cat-a", unit(0), category="SIEM", source_row_index=0),
        make_event("cat-b", unit(bonus_angle), category="SIEM", source_row_index=1),
    ]
    assert len(cluster_ids(trajectory.link_events(same_category, threshold=0.78))) == 1

    different_categories = [
        make_event("diff-a", unit(0), category="SIEM", source_row_index=0),
        make_event("diff-b", unit(bonus_angle), category="EDR", source_row_index=1),
    ]
    assert len(cluster_ids(trajectory.link_events(different_categories, threshold=0.78))) == 2

    same_vendor = [
        make_event(
            "vendor-a", unit(0), category="SIEM", vendor="ExampleCo", source_row_index=0
        ),
        make_event(
            "vendor-b",
            unit(bonus_angle),
            category="EDR",
            vendor="ExampleCo",
            source_row_index=1,
        ),
    ]
    assert len(cluster_ids(trajectory.link_events(same_vendor, threshold=0.78))) == 1

    chain = [
        make_event(
            f"chain-{index}",
            unit(index * 30),
            date=f"2025-01-{index + 1:02d}",
            category=f"category-{index}",
            source_row_index=index,
        )
        for index in range(5)
    ]
    chain.append(
        make_event(
            "matches-only-first",
            unit(0),
            date="2025-01-06",
            category="last-category",
            source_row_index=5,
        )
    )
    linked_chain = trajectory.link_events(chain, threshold=0.78)
    assert len({event.cluster_id for event in linked_chain[:5]}) == 1
    assert linked_chain[5].cluster_id != linked_chain[0].cluster_id

    isolated = [
        make_event("district-a", unit(0), district="Hillsview", source_row_index=0),
        make_event("district-b", unit(0), district="Lakemont", source_row_index=1),
    ]
    assert len(cluster_ids(trajectory.link_events(isolated, threshold=0.78))) == 2


def determinism_fixture() -> list[Event]:
    return [
        make_event("alpha", unit(0), source_row_index=0),
        make_event("beta", unit(90), source_row_index=1),
        make_event("gamma", unit(5), source_row_index=2),
    ]


def assignments(events: list[Event]) -> dict[str, str | None]:
    linked = trajectory.link_events(events, threshold=0.78)
    return {event.initiative_name: event.cluster_id for event in linked}


def test_determinism() -> None:
    expected = assignments(determinism_fixture())
    assert expected["alpha"] == expected["gamma"]
    assert expected["alpha"] != expected["beta"]
    for seed in range(8):
        shuffled = determinism_fixture()
        random.Random(seed).shuffle(shuffled)
        assert assignments(shuffled) == expected


def test_clip_windows() -> None:
    text = "A" * 10_000 + "cybersecurity" + "B" * 100 + "ransomware" + "C" * 10_000
    clipped = trajectory.clip_windows(text)
    assert "cybersecurity" in clipped
    assert "ransomware" in clipped
    assert clipped.count("B" * 100) == 1
    assert len(clipped) <= 24_000
    assert "A" * 5_000 not in clipped
    assert "C" * 5_000 not in clipped

    at_start = trajectory.clip_windows("cybersecurity" + "Z" * 30_000, max_chars=5_000)
    assert at_start.startswith("cybersecurity")
    assert len(at_start) <= 5_000
    no_keyword = "plain agenda furniture " * 1_000
    assert trajectory.clip_windows(no_keyword, max_chars=321) == no_keyword[:321]


def test_factual_evidence_validation() -> None:
    source = (
        "The board authorized a SIEM request for proposals. "
        "Staff cited Grounded Systems and a $450,000 budget ceiling. "
        + "X" * 301
    )
    valid = {
        "initiative_name": "SIEM",
        "normalized_category": "SIEM",
        "state": "AUTHORIZATION",
        "action": "Issue an RFP",
        "vendor": "grounded systems",
        "amount": "$450,000",
        "summary": "The board authorized a solicitation.",
        "evidence": "The board authorized a SIEM request for proposals.",
    }
    invented_evidence = {**valid, "evidence": "The board selected Fictional Vendor."}
    too_long = {**valid, "evidence": "X" * 301}
    invented_vendor = {**valid, "vendor": "Made Up Corp"}
    invented_amount = {**valid, "amount": "$999,999"}
    with redirect_stderr(io.StringIO()):
        accepted = trajectory._validated_content_events(
            {
                "events": [
                    valid,
                    invented_evidence,
                    too_long,
                    invented_vendor,
                    invented_amount,
                ]
            },
            source,
        )
    assert len(accepted) == 1
    assert accepted[0]["evidence"] == valid["evidence"]
    assert accepted[0]["vendor"] == "grounded systems"
    assert accepted[0]["amount"] == 450_000.0

    assert trajectory.parse_amount("$295,750/annually") == 295_750.0
    assert trajectory.parse_amount("$294,675/3 year coverage") == 294_675.0
    assert trajectory.parse_amount("not an amount") is None

    previous_cache = trajectory.CACHE_DIR
    with tempfile.TemporaryDirectory() as temporary_directory:
        trajectory.CACHE_DIR = Path(temporary_directory)
        excerpt = trajectory.clip_windows(source)
        cache_key = trajectory.sha1(
            trajectory.EXTRACT_MODEL
            + "\x00"
            + trajectory.PROMPT_VERSION
            + "\x00"
            + trajectory.EXTRACT_VALIDATION_VERSION
            + "\x00"
            + excerpt
        )
        trajectory.write_json(
            trajectory.CACHE_DIR / "extract" / f"{cache_key}.json",
            [invented_vendor, invented_amount],
        )
        try:
            with redirect_stderr(io.StringIO()):
                cached_events = trajectory.extract_events(
                    source,
                    {
                        "district": "Hillsview",
                        "meeting_date": "2025-01-01",
                        "source_type": "minutes",
                        "url": "fixture://cached-grounding",
                    },
                )
        finally:
            trajectory.CACHE_DIR = previous_cache
    assert cached_events == []


def test_eval_edges() -> None:
    outcome = pd.DataFrame(
        [
            {
                "district": "Hillsview",
                "outcome_date": "2026-04-10",
                "outcome_type": "RFP",
                "title": "SIEM System",
                "vendor": "",
                "url": "https://example.com/rfp",
            }
        ]
    )

    post_outcome = make_event("late", unit(0), date="2026-04-11")
    post_outcome.cluster_id = "hillsview-0"
    post_match = trajectory.match_outcomes(
        [post_outcome], outcome, match_threshold=0.5, outcome_embeddings=[unit(0)]
    )
    assert post_match["hillsview-0"]["matched"] is False

    below_floor = make_event("weak", unit(0), date="2025-08-21")
    below_floor.cluster_id = "hillsview-0"
    weak_vector = [0.4, math.sqrt(1 - 0.4**2)]
    weak_match = trajectory.match_outcomes(
        [below_floor], outcome, match_threshold=0.5, outcome_embeddings=[weak_vector]
    )
    assert weak_match["hillsview-0"]["matched"] is False
    assert math.isclose(weak_match["hillsview-0"]["similarity"], 0.4, abs_tol=1e-4)

    early = make_event("early SIEM", unit(0), date="2025-08-21")
    early.cluster_id = "hillsview-0"
    timelines = trajectory.build_timelines([early])
    sources = pd.DataFrame(
        [
            {"district": "Hillsview"},
            {"district": "Lakemont"},
        ]
    )
    comparison, metrics, pairs = trajectory.evaluate(
        [early],
        timelines,
        outcome,
        sources,
        threshold=0.78,
        match_threshold=0.5,
        outcome_embeddings=[unit(0)],
    )
    assert comparison["hillsview-0"]["matched"] is True
    assert comparison["hillsview-0"]["lead_days"] == 232
    assert metrics["coverage"] == {"covered": 1, "total": 1, "rate": 1.0}
    assert metrics["median_lead_days"] == 232
    assert metrics["control_fp"]["control_districts"] == 1
    assert metrics["control_fp"]["firing_districts"] == 0
    assert metrics["control_fp"]["rate"] == 0.0
    assert pairs[0]["lead_days"] == 232


def test_link_threshold_receipt() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        output = Path(temporary_directory)
        sources_path = output / "sources.csv"
        outcomes_path = output / "outcomes.csv"
        sources_path.write_text(
            "district,meeting_date,source_type,url\n", encoding="utf-8"
        )
        outcomes_path.write_text(
            "district,outcome_date,outcome_type,title,vendor,url\n", encoding="utf-8"
        )
        trajectory.write_json(
            output / "events.json",
            {"model": "offline", "prompt_version": "1", "events": []},
        )

        with redirect_stdout(io.StringIO()):
            trajectory._run_link(str(output), threshold=0.83)
            trajectory._run_eval(
                str(sources_path), str(outcomes_path), str(output), match_threshold=0.5
            )
        event_document = json.loads((output / "events.json").read_text(encoding="utf-8"))
        metrics = json.loads((output / "metrics.json").read_text(encoding="utf-8"))
        assert event_document["link_threshold"] == 0.83
        assert metrics["threshold"] == 0.83

        event_document.pop("link_threshold")
        trajectory.write_json(output / "events.json", event_document)
        with redirect_stdout(io.StringIO()):
            trajectory._run_eval(
                str(sources_path), str(outcomes_path), str(output), match_threshold=0.5
            )
        legacy_metrics = json.loads((output / "metrics.json").read_text(encoding="utf-8"))
        assert legacy_metrics["threshold"] == 0.78
        assert not hasattr(trajectory._parser().parse_args(["eval"]), "threshold")


def test_eval_rejects_stale_link_artifacts() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        output = Path(temporary_directory)
        event = make_event("stale", unit(0))
        event.cluster_id = "hillsview-0"
        trajectory.write_json(
            output / "events.json",
            {
                "model": "offline",
                "prompt_version": "1",
                "events": [trajectory._event_json(event, include_cluster=True)],
            },
        )
        trajectory.write_json(output / "timelines.json", {"hillsview-1": {}})
        try:
            trajectory._run_eval(
                "unused-sources.csv",
                "unused-outcomes.csv",
                str(output),
                match_threshold=0.5,
            )
        except SystemExit as exc:
            assert "run link first" in str(exc)
        else:
            raise AssertionError("stale link artifacts should be rejected")


def test_zero_event_warning() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        output = Path(temporary_directory)
        sources_path = output / "sources.csv"
        fixture_path = trajectory.ROOT / "data/fixtures/lakemont_2025-10-02_facilities.txt"
        sources_path.write_text(
            "district,meeting_date,source_type,url\n"
            f"Lakemont,2025-10-02,minutes,{fixture_path}\n",
            encoding="utf-8",
        )
        previous_key = os.environ.get("OPENAI_API_KEY")
        os.environ["OPENAI_API_KEY"] = "offline-test-key-not-used"
        error_output = io.StringIO()
        try:
            with redirect_stdout(io.StringIO()), redirect_stderr(error_output):
                trajectory._run_extract(str(sources_path), str(output))
        finally:
            if previous_key is None:
                os.environ.pop("OPENAI_API_KEY", None)
            else:
                os.environ["OPENAI_API_KEY"] = previous_key
        assert "non-empty sources produced zero extracted events" in error_output.getvalue()


def _fake_playwright_module(
    response_bytes: bytes,
    *,
    content_type: str = "application/pdf",
) -> tuple[types.SimpleNamespace, dict[str, object]]:
    calls: dict[str, object] = {"browser_closed": False}

    class Navigation:
        ok = True
        status = 200
        headers = {"content-type": content_type}

        def body(self) -> bytes:
            calls["body_read"] = True
            return response_bytes

    class Page:
        def goto(self, url: str, **kwargs: object) -> Navigation:
            calls["url"] = url
            calls["goto_kwargs"] = kwargs
            return Navigation()

        def wait_for_timeout(self, milliseconds: int) -> None:
            calls["waited"] = milliseconds

        def locator(self, selector: str) -> object:
            raise AssertionError(f"HTML path should not be used for a PDF: {selector}")

    class Browser:
        def new_page(self) -> Page:
            return Page()

        def close(self) -> None:
            calls["browser_closed"] = True

    class Chromium:
        def launch(self, *, headless: bool) -> Browser:
            calls["headless"] = headless
            return Browser()

    class Playwright:
        chromium = Chromium()

    class Manager:
        def __enter__(self) -> Playwright:
            return Playwright()

        def __exit__(self, *args: object) -> None:
            return None

    return types.SimpleNamespace(sync_playwright=lambda: Manager()), calls


def _fake_html_playwright_module(
    rendered_texts: list[str],
) -> tuple[types.SimpleNamespace, dict[str, object]]:
    calls: dict[str, object] = {"browser_closed": False, "waits": 0, "launches": 0}

    class Navigation:
        ok = True
        status = 200
        headers = {"content-type": "text/html"}

        def body(self) -> bytes:
            return b"<html><body></body></html>"

    class Locator:
        index = 0

        def inner_text(self, *, timeout: int) -> str:
            calls["inner_text_timeout"] = timeout
            value = rendered_texts[min(self.index, len(rendered_texts) - 1)]
            self.index += 1
            return value

    class Page:
        locator_instance = Locator()

        def goto(self, url: str, **kwargs: object) -> Navigation:
            calls["url"] = url
            return Navigation()

        def wait_for_timeout(self, milliseconds: int) -> None:
            calls["waits"] = int(calls["waits"]) + 1
            calls["wait_milliseconds"] = milliseconds

        def locator(self, selector: str) -> Locator:
            assert selector == "body"
            return self.locator_instance

    class Browser:
        def new_page(self) -> Page:
            return Page()

        def close(self) -> None:
            calls["browser_closed"] = True

    class Chromium:
        def launch(self, *, headless: bool) -> Browser:
            calls["launches"] = int(calls["launches"]) + 1
            return Browser()

    class Playwright:
        chromium = Chromium()

    class Manager:
        def __enter__(self) -> Playwright:
            return Playwright()

        def __exit__(self, *args: object) -> None:
            return None

    return types.SimpleNamespace(sync_playwright=lambda: Manager()), calls


def test_pdf_403_uses_browser_response_bytes() -> None:
    url = "https://official.example/agenda/document.pdf"
    browser_pdf = b"%PDF-browser-response"

    class BlockedResponse:
        ok = False
        status_code = 403
        headers = {"content-type": "application/pdf"}
        content = b"blocked"

    fake_requests = types.SimpleNamespace(
        RequestException=RuntimeError,
        get=lambda *args, **kwargs: BlockedResponse(),
    )
    fake_playwright, calls = _fake_playwright_module(browser_pdf)

    with (
        patch.dict(
            sys.modules,
            {"requests": fake_requests, "playwright.sync_api": fake_playwright},
        ),
        patch.object(trajectory, "cached", lambda kind, key, compute: compute()),
        patch.object(trajectory, "_pdf_text", lambda data: f"decoded:{data.decode()}"),
    ):
        text = trajectory._network_text(url)

    assert text == "decoded:%PDF-browser-response"
    assert calls["url"] == url
    assert calls["body_read"] is True
    assert calls["browser_closed"] is True


def test_pdf_request_error_uses_browser_response_bytes() -> None:
    url = "https://official.example/agenda/document.pdf?download=1"
    browser_pdf = b"%PDF-browser-response"

    class RequestError(Exception):
        pass

    def fail_request(*args: object, **kwargs: object) -> object:
        raise RequestError("portal rejected direct client")

    fake_requests = types.SimpleNamespace(
        RequestException=RequestError,
        get=fail_request,
    )
    # Octet-stream verifies that PDF magic, not just a .pdf suffix/header, is honored.
    fake_playwright, calls = _fake_playwright_module(
        browser_pdf,
        content_type="application/octet-stream",
    )

    with (
        patch.dict(
            sys.modules,
            {"requests": fake_requests, "playwright.sync_api": fake_playwright},
        ),
        patch.object(trajectory, "cached", lambda kind, key, compute: compute()),
        patch.object(trajectory, "_pdf_text", lambda data: f"decoded:{data.decode()}"),
    ):
        text = trajectory._network_text(url)

    assert text == "decoded:%PDF-browser-response"
    assert calls["url"] == url
    assert calls["browser_closed"] is True


def test_successful_direct_pdf_preserves_fast_path() -> None:
    url = "https://official.example/document.pdf"
    request_call: dict[str, object] = {}

    class DirectResponse:
        ok = True
        headers = {"content-type": "application/pdf"}
        content = b"%PDF-direct-response"

    def direct_request(*args: object, **kwargs: object) -> DirectResponse:
        request_call["args"] = args
        request_call["kwargs"] = kwargs
        return DirectResponse()

    fake_requests = types.SimpleNamespace(RequestException=RuntimeError, get=direct_request)

    with (
        patch.dict(sys.modules, {"requests": fake_requests}),
        patch.object(trajectory, "cached", lambda kind, key, compute: compute()),
        patch.object(trajectory, "_pdf_text", lambda data: f"decoded:{data.decode()}"),
        patch.object(
            trajectory,
            "_browser_network_text",
            side_effect=AssertionError("browser fallback should not run"),
        ),
    ):
        text = trajectory._network_text(url)

    assert text == "decoded:%PDF-direct-response"
    request_headers = request_call["kwargs"]["headers"]  # type: ignore[index]
    assert request_headers["User-Agent"].startswith("Mozilla/5.0")
    assert "Chrome/" in request_headers["User-Agent"]
    assert "NationGraph" not in request_headers["User-Agent"]


def test_browser_html_waits_for_stable_meaningful_text() -> None:
    url = "https://official.example/agenda/goto?open&id=ITEM"
    full_text = "Cybersecurity roadmap and implementation details. " * 20
    fake_playwright, calls = _fake_html_playwright_module(["", "Loading", full_text, full_text])

    with (
        patch.dict(sys.modules, {"playwright.sync_api": fake_playwright}),
    ):
        text = trajectory._browser_network_text(url)

    assert text == trajectory.clean_text(full_text)
    assert int(calls["waits"]) >= 3
    assert calls["wait_milliseconds"] == 500
    assert calls["browser_closed"] is True


def test_short_browser_html_is_not_cached() -> None:
    url = "https://official.example/agenda/goto?open&id=EMPTY"

    class HtmlResponse:
        ok = True
        headers = {"content-type": "text/html"}

    fake_requests = types.SimpleNamespace(
        RequestException=RuntimeError,
        get=lambda *args, **kwargs: HtmlResponse(),
    )
    fake_playwright, calls = _fake_html_playwright_module(["Loading"])

    with tempfile.TemporaryDirectory() as temporary_directory:
        with (
            patch.dict(
                sys.modules,
                {"requests": fake_requests, "playwright.sync_api": fake_playwright},
            ),
            patch.object(trajectory, "CACHE_DIR", Path(temporary_directory)),
        ):
            for _ in range(2):
                try:
                    trajectory._network_text(url)
                except RuntimeError as exc:
                    assert "rendered only 7 characters" in str(exc)
                else:
                    raise AssertionError("short rendered HTML should fail")

        assert list(Path(temporary_directory).rglob("*.json")) == []
    assert calls["launches"] == 2


def test_fetch_cache_key_is_versioned() -> None:
    url = "https://official.example/document.pdf"
    captured: dict[str, str] = {}

    class DirectResponse:
        ok = True
        headers = {"content-type": "application/pdf"}
        content = b"%PDF-direct-response"

    fake_requests = types.SimpleNamespace(
        RequestException=RuntimeError,
        get=lambda *args, **kwargs: DirectResponse(),
    )

    def capture_cache(kind: str, key: str, compute: object) -> str:
        captured["kind"] = kind
        captured["key"] = key
        return "cached"

    with (
        patch.dict(sys.modules, {"requests": fake_requests}),
        patch.object(trajectory, "cached", capture_cache),
    ):
        assert trajectory._network_text(url) == "cached"

    assert captured["kind"] == "fetch"
    assert captured["key"] == trajectory.sha1(f"{trajectory.FETCH_VERSION}:{url}")
    assert captured["key"] != trajectory.sha1(url)


def test_short_fetch_warning_is_source_agnostic() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        directory = Path(temporary_directory)
        document_path = directory / "brief.txt"
        document_path.write_text("brief agenda", encoding="utf-8")
        sources_path = directory / "sources.csv"
        sources_path.write_text(
            "district,meeting_date,source_type,url\n"
            f"Hillsview,2025-01-01,agenda,{document_path}\n",
            encoding="utf-8",
        )

        output = io.StringIO()
        with redirect_stdout(output):
            trajectory._run_fetch(str(sources_path))

    message = output.getvalue()
    assert "under 500 chars; document may be scanned or not fully rendered" in message
    assert "PDF may be scanned" not in message


def main() -> None:
    test_linker()
    test_determinism()
    test_clip_windows()
    test_factual_evidence_validation()
    test_eval_edges()
    test_link_threshold_receipt()
    test_eval_rejects_stale_link_artifacts()
    test_zero_event_warning()
    test_pdf_403_uses_browser_response_bytes()
    test_pdf_request_error_uses_browser_response_bytes()
    test_successful_direct_pdf_preserves_fast_path()
    test_browser_html_waits_for_stable_meaningful_text()
    test_short_browser_html_is_not_cached()
    test_fetch_cache_key_is_versioned()
    test_short_fetch_warning_is_source_agnostic()
    print("test_trajectory.py: all offline assertions passed")


if __name__ == "__main__":
    main()
