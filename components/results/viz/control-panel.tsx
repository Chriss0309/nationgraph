"use client";

import { motion, type Variants } from "motion/react";

import { useVizArmed } from "@/components/results/viz/use-viz-armed";

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.3, duration: 0.45, ease: "easeOut" },
  }),
};

const sweepVariants: Variants = {
  hidden: { x: "-120%" },
  show: (index: number) => ({
    x: "120%",
    transition: { delay: 0.35 + index * 0.3, duration: 0.65, ease: "easeInOut" },
  }),
};

const statusVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.8 + index * 0.3, duration: 0.35, ease: "easeOut" },
  }),
};

export function ControlPanel({
  label,
  statusText,
  total,
}: {
  label: string;
  statusText: string;
  total: number;
}) {
  const armed = useVizArmed();

  return (
    <figure className="viz" role="img" aria-label={label}>
      <span className="sr-only">{label}</span>
      <h3 className="figure-title">Control panel</h3>
      <motion.div
        className="mt-5 grid gap-3 sm:grid-cols-3"
        initial="hidden"
        animate={armed ? undefined : "hidden"}
        whileInView={armed ? "show" : undefined}
        viewport={{ amount: 0.4, once: true }}
        aria-hidden="true"
      >
        {Array.from({ length: total }, (_, index) => (
          <motion.div
            key={index}
            custom={index}
            variants={tileVariants}
            className="relative overflow-hidden border border-border bg-background p-4"
          >
            <motion.span
              custom={index}
              variants={sweepVariants}
              className="control-sweep pointer-events-none absolute inset-0"
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Control {index + 1}
            </p>
            <motion.p
              custom={index}
              variants={statusVariants}
              className="mt-8 font-mono text-xs text-ng-green-700"
            >
              {statusText}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>
    </figure>
  );
}
