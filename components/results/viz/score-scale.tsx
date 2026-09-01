"use client";

import { motion, type Variants } from "motion/react";

import { useVizArmed } from "@/components/results/viz/use-viz-armed";

export interface ScoreRow {
  id: string;
  name: string;
  score: number | null;
  scoreLabel: string;
  matched: boolean;
}

const zoneVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delay: 0.2, duration: 0.6 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + index * 0.12, duration: 0.4, ease: "easeOut" },
  }),
};

const pulseVariants: Variants = {
  hidden: { opacity: 0, scale: 1 },
  show: {
    opacity: [0.5, 0],
    scale: 2.4,
    transition: { delay: 1.6, duration: 0.9, ease: "easeOut" },
  },
};

function dotVariants(score: number, index: number): Variants {
  return {
    hidden: { left: "0%", opacity: 0 },
    show: {
      left: `${score * 100}%`,
      opacity: 1,
      transition: {
        delay: 0.5 + index * 0.15,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };
}

export function ScoreScale({
  floor,
  floorLabel,
  label,
  rows,
}: {
  floor: number;
  floorLabel: string;
  label: string;
  rows: ScoreRow[];
}) {
  const armed = useVizArmed();
  const floorPct = `${floor * 100}%`;

  return (
    <figure className="viz" role="img" aria-label={label}>
      <span className="sr-only">{label}</span>
      <h3 className="figure-title">Scored against the real RFP</h3>
      <motion.div
        initial="hidden"
        animate={armed ? undefined : "hidden"}
        whileInView={armed ? "show" : undefined}
        viewport={{ amount: 0.4, once: true }}
        aria-hidden="true"
      >
        <div className="relative mt-6 mb-1 h-9 font-mono text-[10px] text-muted-foreground">
          <span className="absolute bottom-0 left-0">0</span>
          <span className="absolute right-0 bottom-0">1</span>
          <div className="absolute top-0 bottom-0" style={{ left: floorPct }}>
            <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-ng-green-700">
              match floor {floorLabel}
            </span>
            <span className="absolute bottom-0 left-0 h-2.5 w-px bg-ng-green-600" />
          </div>
        </div>

        <div className="relative">
          <motion.div
            variants={zoneVariants}
            className="absolute inset-y-0 right-0 bg-ng-tint-2"
            style={{ left: floorPct }}
          />

          <div className="relative space-y-6 py-4">
            {rows.map((row, index) => (
              <motion.div key={row.id} custom={index} variants={rowVariants}>
                <div className="mb-2 flex items-baseline justify-between gap-3 font-mono text-[10px] leading-4 sm:text-xs">
                  <span className="min-w-0 truncate">{row.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {row.scoreLabel}
                  </span>
                </div>
                <div className="relative h-3">
                  <span className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-border" />
                  {row.score === null ? null : (
                    <motion.span
                      variants={dotVariants(row.score, index)}
                      className={
                        row.matched
                          ? "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ng-green-500"
                          : "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neutral-400 bg-background"
                      }
                    >
                      {row.matched ? (
                        <motion.span
                          variants={pulseVariants}
                          className="absolute inset-0 rounded-full bg-ng-green-500"
                        />
                      ) : null}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </figure>
  );
}
