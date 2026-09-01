"use client";

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || inView) return;

    if (!("IntersectionObserver" in window)) {
      root.dataset.inview = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [inView]);

  return (
    <div
      ref={rootRef}
      className={className}
      data-inview={inView ? "true" : "false"}
    >
      {children}
    </div>
  );
}
