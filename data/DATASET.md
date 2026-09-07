# Dataset protocol

This evaluation is outcome-first. A district enters the positive sample because an
official school-board or procurement record documents a cybersecurity solicitation,
award, subscription approval, or renewal—not because the trajectory engine already
finds an early signal there.

## Target sample

- Development: 5 positive outcomes and 3 matched controls.
- Locked holdout: 15 positive outcomes and 7 matched controls.
- Current Hillsborough and Pinellas records belong to development only.

The extraction prompt, link threshold (`0.78`), and outcome-match threshold (`0.50`)
must remain frozen before the holdout districts are processed.

## Positive cases

1. Record an official outcome date, type, title, vendor when stated, and URL.
2. Define an 18-month observation window ending the day before that outcome.
3. Collect the district's available official board agendas, minutes, workshops, budget
   materials, and procurement notices for that window. Do not select documents based
   on whether they make the desired trajectory easy to find.
4. Keep the outcome in the denominator even when the window contains no observable
   pre-outcome signal. Missing public evidence is a valid false negative, not grounds
   for removing the district.
5. Never use post-outcome documents as source evidence.

## Controls

Controls are matched to positive districts by approximate enrollment, calendar period,
and document-portal type. Search the same official board and procurement surfaces for
the paired period. A control is eligible only when that bounded search finds no official
cybersecurity procurement outcome; the claim is limited to the searched period and
sources, not an assertion that the district never purchased cybersecurity products.

Collect the same classes of documents and use the same 18-month window. Controls with
zero extracted events remain in the false-positive denominator.

## Evidence standard

- Official district, school-board, or government procurement sources only.
- Dates and quoted evidence must be visible in the source.
- Vendor and amount stay blank unless the source states them.
- Every accepted source must be strictly earlier than its outcome.
- Searches that produce no defensible document are logged as missing; no substitute or
  fictional content is created.

## Holdout construction (automated, 2026-09-07)

The development corpus above was collected by hand. The holdout is built by `corpus.py`
from two machine-readable surfaces so that no document or outcome is chosen by a person:

- Outcomes: E-rate FCC Form 470 filings from USAC open data (dataset `jt8s-3q52`),
  filtered to Florida, applicant type "School District", and a firewall function. One
  positive case per district and funding year; the index date is the earliest certified
  date in that year and the outcome document is the certified form or its RFP attachment.
  Charter operators, diocesan systems, and library systems are excluded by name matching
  against the 67 county districts in `data/districts.csv`.
- Sources: every BoardDocs agenda packet of the district inside the 18-month window ending
  the day before the index date, from the portal's own meeting index. A case with fewer
  than 8 packets in its window is recorded as `insufficient_sources` and excluded from the
  denominators, because "no signal" means nothing when nothing was read.
- Controls: for each complete positive case, one BoardDocs district with no firewall
  filing from the window start through 365 days after the index date and at least 8
  packets in the same window, choosing the least-reused district by name order. This
  matches the protocol on calendar period and portal type; it does not match on
  enrollment, which the hand-built development controls did.
- Scope: districts whose agendas are not on BoardDocs are out of scope and listed as such.
  The control claim is bounded to E-rate firewall filings; a control may have bought a
  firewall outside E-rate.

The prompt (`PROMPT_VERSION` 2), link threshold `0.78`, and match floor `0.50` are the
frozen development values. Multiple cases from one district share packets across
overlapping windows; the extraction cache means each packet is read by the model once.

## Reporting

Report raw counts alongside coverage, median lead days, reviewed precision, and control
false-positive rate. Development results are for debugging. Only the untouched holdout
is evidence about generalization, and a metric with a zero denominator is reported as
not measured.

## Holdout result (2026-09-07, frozen parameters)

17 positive cases and 17 controls across 45 BoardDocs districts; 1,760 packets; 42
grounded events in 39 trajectories, none spanning two meetings. Coverage 1/17 (Indian
River FY2023, 319 days early at similarity 0.53). Control alarms 1/17 (Jefferson FY2026:
two agenda items from one July 2024 meeting approving Fortinet firewall hardware and
support, a purchase made outside E-rate). Precision awaits one human label. Nothing was
tuned after this run; the known failure modes it exposed are listed in the README.
