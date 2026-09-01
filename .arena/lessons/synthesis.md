# Synthesis: base = Candidate A

Parent scored A and B end to end. Cross-judge skipped. Other-model usage limit. Candidate C landed after the pick. It was read in full. No graft. The recap table restates five beats the page already taught. Its figure is the holdout cell grid A and B both killed. Implementation continues on A plus the B grafts below.

Agreement: both A and B replace the holdout cell grid with a claim-versus-this-run meeting chain. That is the pick. The figure is the thesis.

## Base

Candidate A. Method-matching two-column closer. Numbered rows left, one figure right. `lessonsViewFromMetrics` owns copy and figure policy. Public surface stays `<Lessons metrics={dossier.metrics} />`. Four-tuple `LessonTable`. `ThesisShape` from `events === clusters`.

A wins on interface depth and consistency. The user asked to keep the dossier feel. A does not invert the page rhythm. A’s types make a fifth lesson a type error. A names the quote gate in Method and Exhibit A so Lessons is not the first time the reader hears the word.

## Grafts from B

1. **Thesis spoken before the list body.** Keep H2 as `What I'd do differently.` (the user’s words). Rewrite the lede so a skimmer can repeat the claim without reading the rows.
2. **Cut the holdout census from the last word.** 15+7 stays as one sentence in lesson 04, not a wall of thresholds and not a figure.
3. **Lesson 04 next-step.** A wider sample of still-thin districts makes more dots, not a chain. Depth first.
4. **Reject B’s dashed hashes, match stubs, and layout inversion.** More CSS. Orange stub can be misread as a completed chain. List-under-figure breaks the Method rhyme.

## Rejections

- **B as base.** Sharper title, worse fit. “I never followed one purchase across meetings” steals the H2 the user asked for and invents a new section genre on a page that already rhymes Method and Limitation.
- **Holdout cell grid.** Both candidates killed it. Confirmed.
- **Pass `hit` and draw Charlotte.** The hit is one meeting. Drawing it would celebrate the miss as the claim.
- **Candidate C recap-every-beat.** Dropout. Also rejected on the brief: a second homepage. Limitation and Method already taught coverage and the funnel.
- **Export `lessonsView` to `page.tsx`.** Shallow module.

## Locked copy (current run interpolates)

- Kicker: `Lessons`
- Title: `What I'd do differently.`
- Lede: `This demo claimed I could follow one purchase across public meetings before the RFP, the formal request for proposals. This run taught me I barely collected enough paper to try.`
- 01 title: `Paper was the bottleneck, not the model.`
- 01 body: `{docs} documents went in. {formatCount(events, true)} dated purchase mentions I was allowed to keep came out. Every known purchase I missed traces to meeting paper that never entered the corpus, the documents I actually collected, not to a wrong prediction. The next hours go to deeper collection per district.`
- 02 title: `The quote gate cut both ways.`
- 02 body: `The quote gate is the rule that an event exists only when the source contains a character-for-character sentence I can point to. That is why every claim above can be checked in seconds. It is also why scanned PDFs and paraphrased minutes contributed nothing. The gate stays. OCR, software that turns a scanned page into searchable text, belongs in front of it.`
- 03 title: `I still have not exercised the claim.`
- 03 all-singles: `A trajectory is the paper trail of one purchase forming across meetings. Following one initiative from first mention to the RFP is the point of the pipeline, yet every surviving trajectory in this run is a single meeting. More paper per district turns that from a design into a result.`
- 04 title: `Perfect scores on a tiny sample prove little.`
- 04 body: `{precision.correct}/{precision.labeled} hand-checked precision and {controls.fired} false alarms across {formatCount(controls.total)} control districts, districts I searched that had no known cybersecurity purchase in the window, are the right shape. At this size they are receipts, not evidence. A wider sample of still-thin districts would make more single-meeting dots, not a chain. The next run is a locked holdout of {15} purchases and {7} control districts I do not open until the prompt and the thresholds are frozen.`
- Figure title: `Follow one purchase across meetings.`
- Caption: `The top row is the claim, not a scored district. {formatCount(clusters, true)} trajectories survived this run. Each is one meeting. {formatCount(matches, true)} of them later matched a real RFP.`

## Figure

A’s two-row schematic. Claim row: First mention → Budget talk → Board vote → orange RFP. This-run row: `clusters` isolated green nodes, `matches` with an orange pip. Reuse `stamp-in` and `line-draw`. Delete `.nextrun-cell`. Orange only on RFP marks.

## Wording pass (strings only)

- Method extract: name “quote gate”.
- Exhibit A caption: “Quote gate: …”
- Limitation: “the corpus, the documents actually collected.”

## Verification against rubric

1. Cold reader finish: lede + figure + 03.
2. Thesis named: lede and figure title.
3. Figure earns its place: missing links are the lesson.
4. Dossier consistency: same tokens, Reveal, one prop.
5. Deep module: policy inside Lessons.
6. Surgical: no new island, no new deps.
