from __future__ import annotations

import csv
import hashlib
import os
import tempfile
from pathlib import Path
from typing import Callable
from unittest.mock import patch

import research_dataset


def _case(
    case_id: str = "p1",
    *,
    role: str = "positive",
    district: str = "Example Public Schools",
    complete: bool = False,
    matched_case_id: str = "",
) -> dict[str, str]:
    positive = role == "positive"
    return {
        "case_id": case_id,
        "role": role,
        "district": district,
        "index_date": "2022-01-20",
        "outcome_type": "RFP" if positive else "",
        "outcome_id": f"RFP-{case_id}" if positive else "",
        "title": f"Solicitation {case_id}" if positive else "",
        "vendor": "",
        "amount": "",
        "outcome_url": f"https://official.example/outcomes/{case_id}" if positive else "",
        "window_start": "2020-07-20",
        "window_end": "2022-01-19",
        "portal_type": "custom",
        "enrollment": "1000" if complete else "",
        "matched_case_id": matched_case_id,
        "research_status": "complete" if complete else "pending",
    }


def _inventory(
    case_id: str,
    *,
    status: str = "unavailable",
    document_date: str = "",
    official_url: str = "",
    local_path: str = "",
    retrieved_at: str = "",
    sha256: str = "",
) -> dict[str, str]:
    return {
        "case_id": case_id,
        "document_date": document_date,
        "source_type": "board_minutes" if status == "accepted" else "",
        "meeting_id": "",
        "official_url": official_url,
        "local_path": local_path,
        "status": status,
        "retrieved_at": retrieved_at,
        "sha256": sha256,
        "reason": "",
    }


def _complete_fixture(
    accepted_count: int = 12,
    overrides: dict[str, int] | None = None,
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    positive_districts = [
        "Zulu Public Schools",
        "Alpha Public Schools",
        "Echo Public Schools",
        "Bravo Public Schools",
        "Delta Public Schools",
    ]
    positives = [
        _case(f"p{index}", district=district, complete=True)
        for index, district in enumerate(positive_districts, start=1)
    ]
    controls = [
        _case(
            f"c{index}",
            role="control",
            district=f"Control {index} Public Schools",
            complete=True,
            matched_case_id=f"p{index}",
        )
        for index in range(1, 4)
    ]
    cases = positives + controls
    counts = overrides or {}
    inventory = [
        _inventory(
            row["case_id"],
            status="accepted",
            document_date=f"2021-01-{index + 1:02d}",
            official_url=(
                f"https://official.example/meetings/{row['case_id']}/{index + 1}"
            ),
        )
        for row in cases
        for index in range(counts.get(row["case_id"], accepted_count))
    ]
    return cases, inventory


def _add_local_artifacts(
    root: Path,
    inventory: list[dict[str, str]],
    sizes: list[int],
) -> dict[str, int]:
    size_by_path: dict[str, int] = {}
    rows = [row for row in inventory if row["case_id"] == "p1"][: len(sizes)]
    for index, (row, size) in enumerate(zip(rows, sizes, strict=True), start=1):
        artifact = root / "artifacts" / f"p1-{index}.txt"
        artifact.parent.mkdir(exist_ok=True)
        content = f"artifact {index}".encode()
        artifact.write_bytes(content)
        row["local_path"] = artifact.relative_to(root).as_posix()
        row["retrieved_at"] = "2026-08-28T00:00:00Z"
        row["sha256"] = hashlib.sha256(content).hexdigest()
        size_by_path[str(artifact.resolve()).casefold()] = size
    return size_by_path


def _stat_with_sizes(sizes: dict[str, int]) -> Callable[..., os.stat_result]:
    real_stat = Path.stat

    def stat(path: Path, *args: object, **kwargs: object) -> os.stat_result:
        result = real_stat(path, *args, **kwargs)
        size = sizes.get(str(path).casefold())
        if size is None:
            return result
        values = list(result)
        values[6] = size
        return os.stat_result(values)

    return stat


def _write_csv(
    path: Path,
    fields: tuple[str, ...],
    rows: list[dict[str, str]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def _write_manifests(
    root: Path,
    cases: list[dict[str, str]],
    inventory: list[dict[str, str]],
) -> tuple[Path, Path]:
    cases_path = root / "data" / "development_cases.csv"
    inventory_path = root / "data" / "source_inventory.csv"
    _write_csv(cases_path, research_dataset.CASE_FIELDS, cases)
    _write_csv(inventory_path, research_dataset.INVENTORY_FIELDS, inventory)
    return cases_path, inventory_path


def _expect_error(fragment: str, action: Callable[[], object]) -> None:
    try:
        action()
    except ValueError as exc:
        assert fragment in str(exc), str(exc)
    else:
        raise AssertionError(f"expected validation error containing {fragment!r}")


def test_valid_partial_scaffold() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases_path, inventory_path = _write_manifests(root, [_case()], [])
        cases, inventory = research_dataset.validate(
            cases_path,
            inventory_path,
            root=root,
        )
        assert len(cases) == 1
        assert inventory == []


def test_malformed_exact_window() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        case = _case()
        case["window_start"] = "2020-07-21"
        cases_path, inventory_path = _write_manifests(root, [case], [])
        _expect_error(
            "exact 18-month window",
            lambda: research_dataset.validate(cases_path, inventory_path, root=root),
        )


def test_unknown_source_case() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases_path, inventory_path = _write_manifests(
            root,
            [_case()],
            [_inventory("missing")],
        )
        _expect_error(
            "unknown case_id",
            lambda: research_dataset.validate(cases_path, inventory_path, root=root),
        )


def test_accepted_source_outside_window() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases_path, inventory_path = _write_manifests(
            root,
            [_case()],
            [
                _inventory(
                    "p1",
                    status="accepted",
                    document_date="2022-01-20",
                    official_url="https://official.example/meetings/late",
                )
            ],
        )
        _expect_error(
            "outside its case window",
            lambda: research_dataset.validate(cases_path, inventory_path, root=root),
        )


def test_local_hash_mismatch() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        artifact = root / "artifacts" / "minutes.txt"
        artifact.parent.mkdir()
        artifact.write_text("ordinary board business", encoding="utf-8")
        cases_path, inventory_path = _write_manifests(
            root,
            [_case()],
            [
                _inventory(
                    "p1",
                    status="accepted",
                    document_date="2021-01-05",
                    official_url="https://official.example/meetings/1",
                    local_path="artifacts/minutes.txt",
                    retrieved_at="2026-08-28T00:00:00Z",
                    sha256="0" * 64,
                )
            ],
        )
        _expect_error(
            "sha256 mismatch",
            lambda: research_dataset.validate(cases_path, inventory_path, root=root),
        )


def test_complete_count_enforcement() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases_path, inventory_path = _write_manifests(
            root,
            [_case(complete=True)],
            [_inventory("p1")],
        )
        _expect_error(
            "exactly 5 positive cases",
            lambda: research_dataset.validate(
                cases_path,
                inventory_path,
                complete=True,
                root=root,
            ),
        )

        outcomes_path = root / "outcomes.csv"
        sources_path = root / "sources.csv"
        outcomes_path.write_text("unchanged outcomes\n", encoding="utf-8")
        sources_path.write_text("unchanged sources\n", encoding="utf-8")
        _expect_error(
            "exactly 5 positive cases",
            lambda: research_dataset.sync(
                cases_path,
                inventory_path,
                outcomes_path,
                sources_path,
                root=root,
            ),
        )
        assert outcomes_path.read_text(encoding="utf-8") == "unchanged outcomes\n"
        assert sources_path.read_text(encoding="utf-8") == "unchanged sources\n"


def test_complete_rejects_11_accepted_rows() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases, inventory = _complete_fixture(overrides={"p1": 11})
        inventory.extend(_inventory("p1") for _ in range(20))
        cases_path, inventory_path = _write_manifests(root, cases, inventory)
        _expect_error(
            "case p1 has 11 accepted inventory rows",
            lambda: research_dataset.validate(
                cases_path,
                inventory_path,
                complete=True,
                root=root,
            ),
        )


def test_complete_rejects_21_accepted_rows() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases, inventory = _complete_fixture(overrides={"p1": 21})
        cases_path, inventory_path = _write_manifests(root, cases, inventory)
        _expect_error(
            "case p1 has 21 accepted inventory rows",
            lambda: research_dataset.validate(
                cases_path,
                inventory_path,
                complete=True,
                root=root,
            ),
        )


def test_complete_accepts_12_and_20_rows() -> None:
    for accepted_count in (12, 20):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            cases, inventory = _complete_fixture(accepted_count)
            cases_path, inventory_path = _write_manifests(root, cases, inventory)
            research_dataset.validate(
                cases_path,
                inventory_path,
                complete=True,
                root=root,
            )


def test_complete_accepts_exact_local_byte_limit() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases, inventory = _complete_fixture()
        half_limit = 25 * 1024 * 1024
        sizes = _add_local_artifacts(root, inventory, [half_limit, half_limit])
        cases_path, inventory_path = _write_manifests(root, cases, inventory)
        with patch.object(Path, "stat", _stat_with_sizes(sizes)):
            research_dataset.validate(
                cases_path,
                inventory_path,
                complete=True,
                root=root,
            )


def test_complete_rejects_local_byte_limit_plus_one() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases, inventory = _complete_fixture()
        half_limit = 25 * 1024 * 1024
        sizes = _add_local_artifacts(root, inventory, [half_limit, half_limit + 1])
        cases_path, inventory_path = _write_manifests(root, cases, inventory)
        with patch.object(Path, "stat", _stat_with_sizes(sizes)):
            _expect_error(
                "case p1 has 52428801 accepted local artifact bytes; limit is 52428800",
                lambda: research_dataset.validate(
                    cases_path,
                    inventory_path,
                    complete=True,
                    root=root,
                ),
            )


def test_successful_sync() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        cases, inventory = _complete_fixture()
        positive_districts = [
            row["district"] for row in cases if row["role"] == "positive"
        ]

        artifact = root / "artifacts" / "p1.txt"
        artifact.parent.mkdir()
        artifact.write_text("routine facilities discussion", encoding="utf-8")
        artifact_hash = hashlib.sha256(artifact.read_bytes()).hexdigest()
        local_source = next(row for row in inventory if row["case_id"] == "p1")
        local_source["local_path"] = "artifacts/p1.txt"
        local_source["retrieved_at"] = "2026-08-28T00:00:00Z"
        local_source["sha256"] = artifact_hash
        cases_path, inventory_path = _write_manifests(
            root,
            list(reversed(cases)),
            list(reversed(inventory)),
        )
        outcomes_path = root / "generated" / "outcomes.csv"
        sources_path = root / "generated" / "sources.csv"

        assert research_dataset.sync(
            cases_path,
            inventory_path,
            outcomes_path,
            sources_path,
            root=root,
        ) == (5, 96)

        outcomes_text = outcomes_path.read_text(encoding="utf-8")
        sources_text = sources_path.read_text(encoding="utf-8")
        assert outcomes_text.splitlines()[0] == (
            "district,outcome_date,outcome_type,title,vendor,url"
        )
        assert sources_text.splitlines()[0] == "district,meeting_date,source_type,url"

        with outcomes_path.open(encoding="utf-8", newline="") as handle:
            outcome_rows = list(csv.DictReader(handle))
        assert [row["district"] for row in outcome_rows] == sorted(
            positive_districts,
            key=str.casefold,
        )

        with sources_path.open(encoding="utf-8", newline="") as handle:
            source_rows = list(csv.DictReader(handle))
        assert any(row["url"] == "artifacts/p1.txt" for row in source_rows)

        research_dataset.sync(
            cases_path,
            inventory_path,
            outcomes_path,
            sources_path,
            root=root,
        )
        assert outcomes_path.read_text(encoding="utf-8") == outcomes_text
        assert sources_path.read_text(encoding="utf-8") == sources_text


def main() -> None:
    test_valid_partial_scaffold()
    test_malformed_exact_window()
    test_unknown_source_case()
    test_accepted_source_outside_window()
    test_local_hash_mismatch()
    test_complete_count_enforcement()
    test_complete_rejects_11_accepted_rows()
    test_complete_rejects_21_accepted_rows()
    test_complete_accepts_12_and_20_rows()
    test_complete_accepts_exact_local_byte_limit()
    test_complete_rejects_local_byte_limit_plus_one()
    test_successful_sync()
    print("test_research_dataset.py: all offline assertions passed")


if __name__ == "__main__":
    main()
