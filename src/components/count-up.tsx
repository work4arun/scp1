"use client";

// Smooth animated number counter — tweens from 0 to `value` over `durationMs`.
// Uses requestAnimationFrame and an ease-out cubic so the count decelerates
// gracefully. Honours prefers-reduced-motion (snaps to the final value).

import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  durationMs = 900,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState<number>(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect users who prefer reduced motion.
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }

    const from = display;
    const to = value;
    if (from === to) return;

    startRef.current = null;

    const step = (timestamp: number) => {
      if (startRef.current == null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = from + (to - from) * eased;
      // Round so the visible number is always an integer.
      setDisplay(Math.round(current));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return <span className={className}>{display}</span>;
}
