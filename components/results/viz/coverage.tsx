"use client";

import { motion, type Variants } from "motion/react";

import { useVizArmed } from "@/components/results/viz/use-viz-armed";

export interface CoverageTile {
  found: boolean;
  title: string | null;
  detail: string;
}

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.1, duration: 0.42, ease: "easeOut" },
  }),
};

const fillVariants: Variants = {
  hidden: { scaleY: 0 },
  show: { scaleY: 1, transition: { delay: 0.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const labelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.7 + index * 0.1, duration: 0.35, ease: "easeOut" },
  }),
};

export function Coverage({
  label,
  tiles,
}: {
  label: string;
  tiles: CoverageTile[];
}) {
  const armed = useVizArmed();

  return (
    <figure className="viz" role="img" aria-label={label}>
      <span className="sr-only">{label}</span>
      <motion.div
        className="grid gap-2 sm:grid-cols-5"
        initial="hidden"
        animate={armed ? undefined : "hidden"}
        whileInView={armed ? "show" : undefined}
        viewport={{ amount: 0.35, once: true }}
        aria-hidden="true"
      >
        {tiles.map((tile, index) => (
          <motion.div
            key={index}
            custom={index}
            variants={tileVariants}
            className={
              tile.found
                ? "relative min-h-28 overflow-hidden border border-ng-green-300 bg-ng-tint-2 p-4"
                : "coverage-missed min-h-28 border border-border p-4"
            }
          >
            {tile.found ? (
              <motion.span
                variants={fillVariants}
                className="absolute inset-0 origin-bottom bg-ng-green-100/35"
              />
            ) : null}
            <motion.p
              custom={index}
              variants={labelVariants}
              className="relative z-10 font-mono text-[10px] leading-5 text-muted-foreground"
            >
              {tile.title === null ? (
                tile.detail
              ) : (
                <>
                  <span className="block font-semibold text-ng-green-800">
                    {tile.title}
                  </span>
                  {tile.detail}
                </>
              )}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>
    </figure>
  );
}
