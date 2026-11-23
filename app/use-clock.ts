"use client";
import { useEffect, useState } from "react";

/** A slow-changing clock value for expiry badges and cached-data labels in render. */
export function useClock() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);
  return now;
}
