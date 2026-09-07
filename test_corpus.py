# /// script
# requires-python = ">=3.13"
# dependencies = ["requests", "beautifulsoup4", "numpy", "pandas"]
# ///
"""Offline assertions for corpus.py: entity mapping, case windows, control matching."""

from __future__ import annotations

from datetime import date

import corpus

DISTRICTS = [
    {"county": "Alachua", "district": "Alachua County Public Schools"},
    {"county": "Indian River", "district": "School District of Indian River County"},
    {"county": "Miami-Dade", "district": "Miami-Dade County Public Schools"},
    {"county": "St. Lucie", "district": "St. Lucie Public Schools"},
    {"county": "Lake", "district": "Lake County Schools"},
    {"county": "Polk", "district": "Polk County Public Schools"},
    {"county": "Orange", "district": "Orange County Public Schools"},
]


def test_match_district() -> None:
    cases = {
        "ALACHUA COUNTY SCHOOL DISTRICT": "Alachua County Public Schools",
        "SCHOOL BOARD OF INDIAN RIVER": "School District of Indian River County",
        "127722 - MIAMI-DADE COUNTY PUBLIC SCHOOLS": "Miami-Dade County Public Schools",
        "ST LUCIE COUNTY SCHOOL DIST": "St. Lucie Public Schools",
        "Alachua Learning Center DBA Alachua Learning Academy": "",
        "LAKE WALES CHARTER SCHOOLS": "",
        "POLK COUNTY LIBRARY CONSORTIUM": "",
        "ORANGE COUNTY LIBRARY SYSTEM": "",
        "KIPP JACKSONVILLE DISTRICT OFFICE": "",
        "Babcock Neighborhood School (District)": "",
    }
    for name, expected in cases.items():
        assert corpus.match_district(name, DISTRICTS) == expected, (name, corpus.match_district(name, DISTRICTS))


def test_months_before() -> None:
    assert corpus.months_before(date(2026, 1, 31), 18) == date(2024, 7, 31)
    assert corpus.months_before(date(2024, 3, 31), 1) == date(2024, 2, 29)


def _meetings(district: str, dates: list[str]) -> list[dict[str, str]]:
    return [
        {"district": district, "meeting_date": day, "meeting_name": "Regular", "meeting_id": f"ID{index:010d}", "url": f"https://example.test/{district}/{day}"}
        for index, day in enumerate(dates)
    ]


def _monthly(start: date, months: int) -> list[str]:
    return [corpus.iso(corpus.months_before(start, -offset)) for offset in range(months)]


def test_build_cases() -> None:
    districts = [
        {"county": "Alpha", "district": "Alpha", "boarddocs_site": "fl/alpha"},
        {"county": "Beta", "district": "Beta", "boarddocs_site": "fl/beta"},
        {"county": "Gamma", "district": "Gamma", "boarddocs_site": "fl/gamma"},
        {"county": "Delta", "district": "Delta", "boarddocs_site": "fl/delta"},
    ]
    usac = [
        # Alpha files in FY2026; two rows, the earlier certified date is the index date.
        {"district": "Alpha", "funding_year": "2026", "certified_date": "2026-02-10", "application_number": "A2", "function": "Firewall Service", "form_pdf": "https://usac.test/a2.pdf", "rfp_url": ""},
        {"district": "Alpha", "funding_year": "2026", "certified_date": "2026-01-15", "application_number": "A1", "function": "Firewall Service", "form_pdf": "https://usac.test/a1.pdf", "rfp_url": ""},
        # Beta filed inside Alpha's window, so Beta cannot be Alpha's control.
        {"district": "Beta", "funding_year": "2025", "certified_date": "2025-03-01", "application_number": "B1", "function": "Firewall", "form_pdf": "", "rfp_url": "https://usac.test/b1.pdf"},
        # Delta filed out of range; skipped as a positive, still excluded as a control for FY2025.
        {"district": "Delta", "funding_year": "2021", "certified_date": "2021-01-01", "application_number": "D1", "function": "Firewall", "form_pdf": "", "rfp_url": ""},
    ]
    meetings = {
        "Alpha": _meetings("Alpha", _monthly(date(2024, 1, 15), 30)),
        "Beta": _meetings("Beta", _monthly(date(2023, 1, 15), 40)),
        "Gamma": _meetings("Gamma", _monthly(date(2024, 1, 15), 30)),
        "Delta": _meetings("Delta", ["2025-01-01", "2025-02-01"]),
    }
    cases = corpus.build_cases(usac, districts, meetings, 2025, 2026)
    by_id = {case["case_id"]: case for case in cases}

    alpha = by_id["alpha_fy2026"]
    assert alpha["index_date"] == "2026-01-15"
    assert alpha["outcome_id"] == "A1"
    assert alpha["window_start"] == "2024-07-15"
    assert alpha["window_end"] == "2026-01-14"
    assert alpha["research_status"] == "complete"
    assert alpha["outcome_url"] == "https://usac.test/a1.pdf"

    beta = by_id["beta_fy2025"]
    assert beta["window_start"] == "2023-09-01"
    assert beta["research_status"] == "complete"
    assert "delta_fy2021" not in by_id

    controls = [case for case in cases if case["role"] == "control"]
    assert {case["matched_case_id"] for case in controls} == {"alpha_fy2026", "beta_fy2025"}
    alpha_control = next(case for case in controls if case["matched_case_id"] == "alpha_fy2026")
    assert alpha_control["district"] == "Gamma", alpha_control
    assert alpha_control["window_start"] == alpha["window_start"]
    beta_control = next(case for case in controls if case["matched_case_id"] == "beta_fy2025")
    assert beta_control["district"] == "Gamma"

    # A positive without enough in-window meetings is recorded but gets no control.
    thin = corpus.build_cases(
        [{"district": "Delta", "funding_year": "2025", "certified_date": "2025-03-01", "application_number": "D2", "function": "Firewall", "form_pdf": "", "rfp_url": ""}],
        districts,
        meetings,
        2025,
        2025,
    )
    assert [case["research_status"] for case in thin] == ["insufficient_sources"]

    assert corpus.case_label(alpha) == "Alpha | FY 2026"
    assert corpus.case_label(alpha_control) == "Gamma | control FY 2026"


def main() -> None:
    for name, test in sorted(globals().items()):
        if name.startswith("test_") and callable(test):
            test()
            print(f"ok {name}")


if __name__ == "__main__":
    main()
