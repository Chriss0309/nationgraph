"use client";

import { animate, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useVizArmed } from "@/components/results/viz/use-viz-armed";

export interface StatItem {
  key: string;
  display: string;
  countTo: number | null;
  label: string;
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.6, once: true });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return <span ref={ref}>{shown}</span>;
}

export function StatStrip({ stats }: { stats: StatItem[] }) {
  const armed = useVizArmed();

  return (
    <motion.div
      className="viz mt-12 grid border-y border-border sm:grid-cols-3"
      initial="hidden"
      animate={armed ? undefined : "hidden"}
      whileInView={armed ? "show" : undefined}
      viewport={{ amount: 0.4, once: true }}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.key}
          className="stat-cell"
          custom={index}
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: (i: number) => ({
              opacity: 1,
              y: 0,
              transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" },
            }),
          }}
        >
          <strong>
            {stat.countTo === null ? stat.display : <CountUp to={stat.countTo} />}
          </strong>
          <span>{stat.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
