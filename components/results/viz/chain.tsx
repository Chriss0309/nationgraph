"use client";

import { motion, type Variants } from "motion/react";

import { useVizArmed } from "@/components/results/viz/use-viz-armed";

function cardVariants(delay: number): Variants {
  return {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { delay, duration: 0.4, ease: "easeOut" },
    },
  };
}

function linkVariants(delay: number): Variants {
  return {
    hidden: { scaleX: 0 },
    show: {
      scaleX: 1,
      transition: { delay, duration: 0.35, ease: "easeOut" },
    },
  };
}

function PaperCard({
  matched,
  muted,
  tag,
  variants,
}: {
  matched?: boolean;
  muted?: boolean;
  tag: string | null;
  variants: Variants;
}) {
  return (
    <motion.div variants={variants} className="relative w-14 shrink-0 sm:w-20">
      <div
        className={
          muted
            ? "rounded-[3px] border border-border bg-background p-2"
            : "rounded-[3px] border border-ng-green-300 bg-background p-2"
        }
      >
        <span className="block h-1 w-3/4 rounded-full bg-muted" />
        <span className="mt-1 block h-1 w-full rounded-full bg-ng-tint-4" />
        <span className="mt-1 block h-1 w-1/2 rounded-full bg-muted" />
      </div>
      {matched ? (
        <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-ng-orange" />
      ) : null}
      {tag === null ? null : (
        <p className="absolute top-full left-1/2 mt-1.5 w-20 -translate-x-1/2 text-center font-mono text-[9px] leading-3 text-muted-foreground">
          {tag}
        </p>
      )}
    </motion.div>
  );
}

export function Chain({
  claim,
  claimLabel,
  label,
  matchedMeetings,
  metaLine,
  runLabel,
  runMeetings,
}: {
  claim: readonly string[];
  claimLabel: string;
  label: string;
  matchedMeetings: number;
  metaLine: string;
  runLabel: string;
  runMeetings: number;
}) {
  const armed = useVizArmed();
  const runNodes = Array.from({ length: runMeetings }, (_, index) => index);

  return (
    <figure className="viz" role="img" aria-label={label}>
      <span className="sr-only">{label}</span>
      <h3 className="figure-title">Follow one purchase across meetings.</h3>
      <motion.div
        initial="hidden"
        animate={armed ? undefined : "hidden"}
        whileInView={armed ? "show" : undefined}
        viewport={{ amount: 0.4, once: true }}
        aria-hidden="true"
      >
        <motion.p
          variants={cardVariants(0)}
          className="mt-6 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase"
        >
          {claimLabel}
        </motion.p>
        <div className="mt-4 flex items-center pb-7">
          {claim.map((name, index) => (
            <span key={name} className="contents">
              {index > 0 ? (
                <motion.span
                  variants={linkVariants(0.25 + index * 0.2)}
                  className="mx-1.5 h-px flex-1 origin-left bg-ng-green-400"
                />
              ) : null}
              <PaperCard tag={name} variants={cardVariants(0.1 + index * 0.2)} />
            </span>
          ))}
          <motion.span
            variants={linkVariants(0.85)}
            className="mx-1.5 h-px flex-1 origin-left bg-ng-green-400"
          />
          <motion.span
            variants={{
              hidden: { opacity: 0, scale: 0.6 },
              show: {
                opacity: 1,
                scale: 1,
                transition: {
                  delay: 1.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 18,
                },
              },
            }}
            className="shrink-0 rounded-[3px] bg-ng-orange px-2 py-1.5 font-mono text-[10px] font-semibold text-white"
          >
            RFP
          </motion.span>
        </div>

        <motion.p
          variants={cardVariants(1.25)}
          className="mt-4 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase"
        >
          {runLabel}
        </motion.p>
        {runNodes.length === 0 ? (
          <motion.p
            variants={cardVariants(1.35)}
            className="mt-4 font-mono text-[10px] text-muted-foreground"
          >
            No trajectories survived this run.
          </motion.p>
        ) : (
          <div className="mt-4 flex items-center gap-5 pb-2 sm:gap-8">
            {runNodes.map((index) => (
              <PaperCard
                key={index}
                muted
                matched={index < matchedMeetings}
                tag={null}
                variants={cardVariants(1.4 + index * 0.12)}
              />
            ))}
          </div>
        )}
        <motion.p
          variants={cardVariants(1.9)}
          className="mt-4 font-mono text-[10px] text-muted-foreground"
        >
          {metaLine}
        </motion.p>

        <motion.p
          variants={cardVariants(2.1)}
          className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-[1px] border border-ng-green-300 bg-background" />
            one meeting&apos;s paper
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-ng-orange" />
            the RFP
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-px w-4 bg-ng-green-400" />
            linked, same purchase
          </span>
        </motion.p>
      </motion.div>
    </figure>
  );
}
