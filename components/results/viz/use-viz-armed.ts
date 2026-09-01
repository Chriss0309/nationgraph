"use client";

import { useEffect, useState } from "react";

export function useVizArmed() {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setArmed(true);
  }, []);

  return armed;
}
