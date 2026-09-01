# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""Validate research manifests and derive the runtime ledgers."""

from __future__ import annotations

import argparse
import calendar
import csv
import hashlib
import io
import os
import re
import sys
import tempfile
from collections import Counter
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
DEVELOPMENT_CASES = ROOT / "data" / "development_cases.csv"
SOURCE_INVENTORY = ROOT / "data" / "source_inventory.csv"
OUTCOMES = ROOT / "data" / "outcomes.csv"
SOURCES = ROOT / "data" / "sources.csv"

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
INVENTORY_FIELDS = (
    "case_id",
    "document_date",
    "source_type",
    "meeting_id",
    "official_url",
    "local_path",
    "status",
    "retrieved_at",
    "sha256",
    "reason",
)
OUTCOME_FIELDS = ("district", "outcome_date", "outcome_type", "title", "vendor", "url")
SOURCE_FIELDS = ("district", "meeting_date", "source_type", "url")
INVENTORY_STATUSES = {
    "accepted",
    "unavailable",
    "duplicate",
    "rejected_out_of_window",
    "rejected_nonofficial",
}
RESEARCH_STATUSES = {"pending", "complete"}
MIN_ACCEPTED_SOURCES = 12
MAX_ACCEPTED_SOURCES = 20
MAX_LOCAL_ARTIFACT_BYTES = 50 * 1024 * 1024
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def _read_csv(path: Path, fields: tuple[str, ...]) -> list[dict[str, str]]:
    try:
        with path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.reader(handle)
            header = next(reader, None)
            if header != list(fields):
                raise ValueError(
                    f"validation failed:\n- {path} must have header {','.join(fields)}"
                )
            rows: list[dict[str, str]] = []
            for line_number, values in enumerate(reader, start=2):
                if len(values) != len(fields):
                    raise ValueError(
                        f"validation failed:\n- {path} row {line_number} has "
                        f"{len(values)} columns; expected {len(fields)}"
                    )
                rows.append(
                    {
                        field: value.strip()
                        for field, value in zip(fields, values, strict=True)
                    }
                )
            return rows
    except FileNotFoundError as exc:
        raise ValueError(f"validation failed:\n- missing manifest: {path}") from exc


def _parse_date(value: str, label: str, errors: list[str]) -> date | None:
    if not DATE_RE.fullmatch(value):
        errors.append(f"{label} must use YYYY-MM-DD")
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        errors.append(f"{label} is not a valid date")
        return None


def _months_before(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 - months
    year, zero_based_month = divmod(month_index, 12)
    month = zero_based_month + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _is_http_url(value: str) -> bool:
    parsed = urlsplit(value)
    return parsed.scheme.lower() in {"http", "https"} and bool(parsed.netloc)


def _validate_local_artifact(
    row: dict[str, str],
    label: str,
    root: Path,
    errors: list[str],
) -> tuple[str | None, int]:
    local_path = row["local_path"]
    if not local_path:
        return None, 0

    relative_path = Path(local_path)
    resolved_root = root.resolve()
    if relative_path.is_absolute():
        errors.append(f"{label} local_path must be repository-relative")
        artifact = None
    else:
        artifact = (resolved_root / relative_path).resolve()
        if not artifact.is_relative_to(resolved_root):
            errors.append(f"{label} local_path must stay inside the repository")
            artifact = None
        elif not artifact.is_file():
            errors.append(f"{label} local_path does not exist: {local_path}")
            artifact = None

    artifact_size = 0
    if artifact is not None:
        try:
            artifact_size = artifact.stat().st_size
        except OSError as exc:
            errors.append(f"{label} could not stat local_path: {exc}")

    if not row["retrieved_at"]:
        errors.append(f"{label} local artifact requires retrieved_at")
    if not row["sha256"]:
        errors.append(f"{label} local artifact requires sha256")
    elif artifact is not None:
        try:
            actual_hash = hashlib.sha256(artifact.read_bytes()).hexdigest()
        except OSError as exc:
            errors.append(f"{label} could not read local_path: {exc}")
        else:
            if row["sha256"].lower() != actual_hash:
                errors.append(f"{label} local artifact sha256 mismatch")

    key = str(artifact).casefold() if artifact is not None else local_path.casefold()
    return key, artifact_size


def _validate_cases(
    cases: list[dict[str, str]],
    errors: list[str],
) -> tuple[dict[str, dict[str, str]], dict[str, tuple[date, date]]]:
    case_by_id: dict[str, dict[str, str]] = {}
    windows: dict[str, tuple[date, date]] = {}

    for line_number, row in enumerate(cases, start=2):
        label = f"development_cases.csv row {line_number}"
        case_id = row["case_id"]
        if not case_id:
            errors.append(f"{label} requires case_id")
        elif case_id in case_by_id:
            errors.append(f"{label} duplicates case_id {case_id}")
        else:
            case_by_id[case_id] = row

        if row["role"] not in {"positive", "control"}:
            errors.append(f"{label} role must be positive or control")
        if not row["district"]:
            errors.append(f"{label} requires district")
        if row["research_status"] not in RESEARCH_STATUSES:
            errors.append(f"{label} research_status must be pending or complete")

        index_date = _parse_date(row["index_date"], f"{label} index_date", errors)
        window_start = _parse_date(row["window_start"], f"{label} window_start", errors)
        window_end = _parse_date(row["window_end"], f"{label} window_end", errors)
        if index_date is not None and window_start is not None and window_end is not None:
            expected_start = _months_before(index_date, 18)
            expected_end = index_date - timedelta(days=1)
            if window_start != expected_start or window_end != expected_end:
                errors.append(
                    f"{label} must use exact 18-month window "
                    f"{expected_start.isoformat()} through {expected_end.isoformat()}"
                )
            elif case_id:
                windows[case_id] = (window_start, window_end)

        if row["role"] == "positive":
            for field in ("outcome_type", "outcome_id", "title", "outcome_url"):
                if not row[field]:
                    errors.append(f"{label} positive case requires {field}")
            if row["matched_case_id"]:
                errors.append(f"{label} positive case must not set matched_case_id")

    positive_ids = {
        row["case_id"]
        for row in cases
        if row["role"] == "positive" and row["case_id"]
    }
    for line_number, row in enumerate(cases, start=2):
        if row["role"] != "control" or not row["matched_case_id"]:
            continue
        if row["matched_case_id"] not in positive_ids:
            errors.append(
                f"development_cases.csv row {line_number} matched_case_id "
                "must point to a positive case"
            )

    return case_by_id, windows


def _validate_inventory(
    inventory: list[dict[str, str]],
    case_by_id: dict[str, dict[str, str]],
    windows: dict[str, tuple[date, date]],
    root: Path,
    errors: list[str],
) -> Counter[str]:
    accepted_urls: dict[str, int] = {}
    accepted_paths: dict[str, int] = {}
    local_bytes: Counter[str] = Counter()

    for line_number, row in enumerate(inventory, start=2):
        label = f"source_inventory.csv row {line_number}"
        case_id = row["case_id"]
        if case_id not in case_by_id:
            errors.append(f"{label} references unknown case_id {case_id!r}")
        if row["status"] not in INVENTORY_STATUSES:
            errors.append(
                f"{label} status must be one of {', '.join(sorted(INVENTORY_STATUSES))}"
            )

        document_date = None
        if row["document_date"]:
            document_date = _parse_date(
                row["document_date"], f"{label} document_date", errors
            )
        if row["status"] != "accepted":
            continue

        if document_date is None and not row["document_date"]:
            errors.append(f"{label} accepted source requires document_date")
        if not row["source_type"]:
            errors.append(f"{label} accepted source requires source_type")
        if not _is_http_url(row["official_url"]):
            errors.append(f"{label} accepted source requires an official HTTP(S) URL")

        url_key = row["official_url"].casefold()
        if url_key:
            if url_key in accepted_urls:
                errors.append(
                    f"{label} duplicates accepted official_url from row "
                    f"{accepted_urls[url_key]}"
                )
            else:
                accepted_urls[url_key] = line_number

        local_key, artifact_size = _validate_local_artifact(row, label, root, errors)
        local_bytes[case_id] += artifact_size
        if local_key:
            if local_key in accepted_paths:
                errors.append(
                    f"{label} duplicates accepted local_path from row "
                    f"{accepted_paths[local_key]}"
                )
            else:
                accepted_paths[local_key] = line_number

        window = windows.get(case_id)
        if document_date is not None and window is not None:
            if not window[0] <= document_date <= window[1]:
                errors.append(f"{label} accepted source is outside its case window")

    return local_bytes


def _validate_complete(
    cases: list[dict[str, str]],
    inventory: list[dict[str, str]],
    local_bytes: Counter[str],
    errors: list[str],
) -> None:
    positives = [row for row in cases if row["role"] == "positive"]
    controls = [row for row in cases if row["role"] == "control"]
    positive_districts = {row["district"].casefold() for row in positives if row["district"]}
    control_districts = {row["district"].casefold() for row in controls if row["district"]}

    if len(positives) != 5 or len(positive_districts) != 5:
        errors.append(
            "complete dataset requires exactly 5 positive cases from 5 distinct "
            f"districts; found {len(positives)} cases across {len(positive_districts)} districts"
        )
    if len(controls) != 3 or len(control_districts) != 3:
        errors.append(
            "complete dataset requires exactly 3 control cases from 3 distinct "
            f"districts; found {len(controls)} cases across {len(control_districts)} districts"
        )
    if positive_districts & control_districts:
        errors.append("complete dataset requires positive and control districts to be distinct")

    inventory_counts = Counter(row["case_id"] for row in inventory)
    accepted_counts = Counter(
        row["case_id"] for row in inventory if row["status"] == "accepted"
    )
    positive_ids = {row["case_id"] for row in positives}
    for line_number, row in enumerate(cases, start=2):
        label = f"development_cases.csv row {line_number}"
        if not re.fullmatch(r"[1-9]\d*", row["enrollment"]):
            errors.append(f"{label} complete case requires a positive integer enrollment")
        if not row["portal_type"]:
            errors.append(f"{label} complete case requires portal_type")
        if row["research_status"] != "complete":
            errors.append(f"{label} research_status must be complete")
        if not row["case_id"] or not inventory_counts[row["case_id"]]:
            errors.append(f"{label} complete case requires at least one inventory row")
        accepted_count = accepted_counts[row["case_id"]]
        if not MIN_ACCEPTED_SOURCES <= accepted_count <= MAX_ACCEPTED_SOURCES:
            errors.append(
                f"{label} case {row['case_id']} has {accepted_count} accepted inventory "
                f"rows; expected {MIN_ACCEPTED_SOURCES} to {MAX_ACCEPTED_SOURCES}"
            )
        artifact_bytes = local_bytes[row["case_id"]]
        if artifact_bytes > MAX_LOCAL_ARTIFACT_BYTES:
            errors.append(
                f"{label} case {row['case_id']} has {artifact_bytes} accepted local "
                f"artifact bytes; limit is {MAX_LOCAL_ARTIFACT_BYTES}"
            )
        if row["role"] == "control" and row["matched_case_id"] not in positive_ids:
            errors.append(f"{label} control matched_case_id must point to a positive case")


def validate(
    cases_path: str | Path = DEVELOPMENT_CASES,
    inventory_path: str | Path = SOURCE_INVENTORY,
    *,
    complete: bool = False,
    root: str | Path = ROOT,
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    cases = _read_csv(Path(cases_path), CASE_FIELDS)
    inventory = _read_csv(Path(inventory_path), INVENTORY_FIELDS)
    errors: list[str] = []
    case_by_id, windows = _validate_cases(cases, errors)
    local_bytes = _validate_inventory(inventory, case_by_id, windows, Path(root), errors)
    if complete:
        _validate_complete(cases, inventory, local_bytes, errors)
    if errors:
        raise ValueError("validation failed:\n" + "\n".join(f"- {error}" for error in errors))
    return cases, inventory


def _csv_text(
    fields: tuple[str, ...],
    rows: list[dict[str, str]],
) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def _write_outputs(outputs: list[tuple[Path, str]]) -> None:
    staged: list[tuple[Path, Path]] = []
    try:
        for target, content in outputs:
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                newline="",
                dir=target.parent,
                prefix=f".{target.name}.",
                suffix=".tmp",
                delete=False,
            ) as handle:
                handle.write(content)
                staged.append((Path(handle.name), target))
        for temporary, target in staged:
            os.replace(temporary, target)
    finally:
        for temporary, _ in staged:
            temporary.unlink(missing_ok=True)


def sync(
    cases_path: str | Path = DEVELOPMENT_CASES,
    inventory_path: str | Path = SOURCE_INVENTORY,
    outcomes_path: str | Path = OUTCOMES,
    sources_path: str | Path = SOURCES,
    *,
    root: str | Path = ROOT,
) -> tuple[int, int]:
    cases, inventory = validate(
        cases_path,
        inventory_path,
        complete=True,
        root=root,
    )
    case_by_id = {row["case_id"]: row for row in cases}

    positive_cases = sorted(
        (row for row in cases if row["role"] == "positive"),
        key=lambda row: (
            row["district"].casefold(),
            row["district"],
            row["index_date"],
            row["case_id"],
        ),
    )
    outcome_rows = [
        {
            "district": row["district"],
            "outcome_date": row["index_date"],
            "outcome_type": row["outcome_type"],
            "title": row["title"],
            "vendor": row["vendor"],
            "url": row["outcome_url"],
        }
        for row in positive_cases
    ]

    accepted = [row for row in inventory if row["status"] == "accepted"]
    accepted.sort(
        key=lambda row: (
            case_by_id[row["case_id"]]["district"].casefold(),
            case_by_id[row["case_id"]]["district"],
            row["document_date"],
            row["source_type"],
            row["local_path"] or row["official_url"],
            row["case_id"],
        )
    )
    source_rows = [
        {
            "district": case_by_id[row["case_id"]]["district"],
            "meeting_date": row["document_date"],
            "source_type": row["source_type"],
            "url": row["local_path"] or row["official_url"],
        }
        for row in accepted
    ]

    _write_outputs(
        [
            (Path(outcomes_path), _csv_text(OUTCOME_FIELDS, outcome_rows)),
            (Path(sources_path), _csv_text(SOURCE_FIELDS, source_rows)),
        ]
    )
    return len(outcome_rows), len(source_rows)


def _summary(
    cases: list[dict[str, str]],
    inventory: list[dict[str, str]],
    complete: bool,
) -> str:
    positives = sum(row["role"] == "positive" for row in cases)
    controls = sum(row["role"] == "control" for row in cases)
    state = "complete" if complete else "pending"
    return (
        f"Validated {positives} positives, {controls} controls, "
        f"{len(inventory)} inventory rows, {state}."
    )


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--complete", action="store_true")
    subparsers.add_parser("sync")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "validate":
            cases, inventory = validate(complete=args.complete)
            print(_summary(cases, inventory, args.complete))
        else:
            outcomes, sources = sync()
            print(f"Synced {outcomes} outcomes and {sources} sources.")
    except (OSError, ValueError) as exc:
        print(exc, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
