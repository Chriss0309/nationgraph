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

## Reporting

Report raw counts alongside coverage, median lead days, reviewed precision, and control
false-positive rate. Development results are for debugging. Only the untouched holdout
is evidence about generalization, and a metric with a zero denominator is reported as
not measured.
