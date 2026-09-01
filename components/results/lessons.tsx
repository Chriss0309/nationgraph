import { Chain } from "@/components/results/viz/chain";
import { formatCount, type DossierMetrics } from "@/lib/dossier";

const HOLDOUT = { positives: 15, controls: 7 } as const;
const CLAIM_CHAIN = ["First mention", "Budget talk", "Board vote"] as const;

type LessonIndex = 1 | 2 | 3 | 4;

interface Lesson {
  readonly index: LessonIndex;
  readonly title: string;
  readonly body: string;
}

type LessonTable = readonly [Lesson, Lesson, Lesson, Lesson];

type ThesisShape =
  | {
      readonly kind: "all-singles";
      readonly runMeetings: number;
      readonly matchedMeetings: number;
    }
  | {
      readonly kind: "has-chains";
      readonly runMeetings: number;
      readonly matchedMeetings: number;
      readonly extraEvents: number;
    };

interface LessonsView {
  readonly title: string;
  readonly lede: string;
  readonly lessons: LessonTable;
  readonly shape: ThesisShape;
  readonly figureLabel: string;
  readonly runLabel: string;
  readonly metaLine: string;
  readonly caption: string;
}

function thesisShape(metrics: DossierMetrics): ThesisShape {
  const runMeetings = metrics.clusters;
  const matchedMeetings = Math.min(metrics.matches, metrics.clusters);
  if (metrics.events > metrics.clusters) {
    return {
      kind: "has-chains",
      extraEvents: metrics.events - metrics.clusters,
      matchedMeetings,
      runMeetings,
    };
  }
  return { kind: "all-singles", matchedMeetings, runMeetings };
}

function lesson03Body(shape: ThesisShape, metrics: DossierMetrics): string {
  if (shape.kind === "has-chains") {
    return `A trajectory is the paper trail of one purchase forming across meetings. Following one initiative from first mention to the RFP is the point of the pipeline. This run produced ${formatCount(metrics.clusters)} trajectories from ${formatCount(metrics.events)} events. A start, not enough to call the claim tested. I still need more paper per district before I can say the chain holds in the wild.`;
  }
  return "A trajectory is the paper trail of one purchase forming across meetings. Following one initiative from first mention to the RFP is the point of the pipeline, yet every surviving trajectory in this run is a single meeting. More paper per district turns that from a design into a result.";
}

function figureLabelFromShape(
  shape: ThesisShape,
  metrics: DossierMetrics,
): string {
  const matched = `${formatCount(metrics.matches, true)} later matched a real RFP.`;
  if (shape.kind === "has-chains") {
    return `The claim is a chain of meetings leading to an RFP. This run produced ${shape.runMeetings} trajectories from ${metrics.events} events. ${matched}`;
  }
  return `The claim is a chain of meetings leading to an RFP. This run produced ${shape.runMeetings} trajectories, each a single meeting. ${matched}`;
}

function thisRunLabel(shape: ThesisShape): string {
  if (shape.kind === "has-chains") {
    const meetingWord = shape.extraEvents === 1 ? "meeting" : "meetings";
    return `This run · ${shape.runMeetings} trajectories, ${shape.extraEvents} extra ${meetingWord} on the chain`;
  }
  return `This run · ${shape.runMeetings} trajectories, each one meeting`;
}

export function lessonsViewFromMetrics(metrics: DossierMetrics): LessonsView {
  const shape = thesisShape(metrics);
  const links = Math.max(0, metrics.events - metrics.clusters);

  return {
    title: "What I'd do differently.",
    lede: "This demo claimed I could follow one purchase across public meetings before the RFP. This run taught me I barely collected enough paper to try.",
    lessons: [
      {
        index: 1,
        title: "Paper was the bottleneck, not the model.",
        body: `${metrics.docs} documents went in. ${formatCount(metrics.events, true)} dated purchase mentions I was allowed to keep came out. Every known purchase I missed traces to meeting paper that never entered the corpus, not to a wrong prediction. The next hours go to deeper collection per district.`,
      },
      {
        index: 2,
        title: "The quote gate cut both ways.",
        body: "The quote gate is the rule that an event exists only when the source contains a character-for-character sentence I can point to. That is why every claim above can be checked in seconds. It is also why scanned PDFs and paraphrased minutes contributed nothing. The gate stays. OCR belongs in front of it.",
      },
      {
        index: 3,
        title: "I still have not exercised the claim.",
        body: lesson03Body(shape, metrics),
      },
      {
        index: 4,
        title: "Perfect scores on a tiny sample prove little.",
        body: `${metrics.precision.correct}/${metrics.precision.labeled} hand-checked precision and ${metrics.controls.fired} false alarms across ${formatCount(metrics.controls.total)} control districts are the right shape. At this size they are receipts, not evidence. A wider sample of still-thin districts would make more single-meeting dots, not a chain. The next run is a locked holdout of ${HOLDOUT.positives} purchases and ${HOLDOUT.controls} control districts I do not open until the prompt and the thresholds are frozen.`,
      },
    ],
    shape,
    figureLabel: figureLabelFromShape(shape, metrics),
    runLabel: thisRunLabel(shape),
    metaLine: `${metrics.clusters} trajectories · ${metrics.events} meetings · ${links} links`,
    caption: `The top row is the claim, not a scored district. ${formatCount(metrics.clusters, true)} trajectories survived this run. Each is one meeting. ${formatCount(metrics.matches, true)} of them later matched a real RFP.`,
  };
}

function LessonRow({
  body,
  index,
  title,
}: {
  body: string;
  index: LessonIndex;
  title: string;
}) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-4 border-t border-border py-5">
      <span className="font-mono text-xs text-muted-foreground">
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-heading text-lg font-semibold tracking-[-0.02em]">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

export function Lessons({ metrics }: { metrics: DossierMetrics }) {
  const view = lessonsViewFromMetrics(metrics);

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <h2 className="section-title">{view.title}</h2>
            <p className="section-lede">{view.lede}</p>
            <ol className="mt-10">
              {view.lessons.map((lesson) => (
                <LessonRow
                  key={lesson.index}
                  index={lesson.index}
                  title={lesson.title}
                  body={lesson.body}
                />
              ))}
            </ol>
          </div>
          <div className="self-center">
            <Chain
              claim={CLAIM_CHAIN}
              claimLabel="The claim · several meetings, then the RFP"
              label={view.figureLabel}
              matchedMeetings={view.shape.matchedMeetings}
              metaLine={view.metaLine}
              runLabel={view.runLabel}
              runMeetings={view.shape.runMeetings}
            />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {view.caption}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
