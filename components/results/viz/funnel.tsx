"use client";

import { motion, type Variants } from "motion/react";

import { useVizArmed } from "@/components/results/viz/use-viz-armed";

const cellVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: (custom: { survivor: boolean; index: number }) => ({
    opacity: custom.survivor ? 1 : 0.15,
    scale: custom.survivor ? 1.15 : 1,
    transition: {
      delay: custom.survivor ? 0.75 + custom.index * 0.006 : custom.index * 0.004,
      duration: 0.32,
      ease: "easeOut",
    },
  }),
};

const stageVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 1.15 + index * 0.14, duration: 0.4, ease: "easeOut" },
  }),
};

export function Funnel({
  docs,
  events,
  label,
  stages,
}: {
  docs: number;
  events: number;
  label: string;
  stages: string[];
}) {
  const armed = useVizArmed();
  const firstSurvivor = Math.max(0, docs - events);
  const cells = Array.from({ length: docs }, (_, index) => index);

  return (
    <figure
      className="viz border border-border bg-card p-5 sm:p-8"
      role="img"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <motion.div
        initial="hidden"
        animate={armed ? undefined : "hidden"}
        whileInView={armed ? "show" : undefined}
        viewport={{ amount: 0.3, once: true }}
        aria-hidden="true"
      >
        <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(20,minmax(0,1fr))] sm:gap-1.5">
          {cells.map((index) => {
            const survivor = index >= firstSurvivor;

            return (
              <motion.span
                key={index}
                custom={{ index, survivor }}
                variants={cellVariants}
                className={
                  survivor
                    ? "aspect-square border border-ng-green-200 bg-ng-green-100"
                    : "aspect-square border border-border bg-muted"
                }
              />
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[10px] text-foreground sm:text-xs">
          {stages.map((stage, index) => (
            <span key={stage} className="contents">
              {index > 0 ? (
                <span className="text-muted-foreground">→</span>
              ) : null}
              <motion.span custom={index} variants={stageVariants}>
                {stage}
              </motion.span>
            </span>
          ))}
        </div>
      </motion.div>
    </figure>
  );
}
