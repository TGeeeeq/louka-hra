import { useEffect, useRef, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Eases a changing number toward its target instead of snapping.
 *
 * HUD readouts (energy, money, hunger…) change in chunky steps; tweening them
 * makes the panel feel alive and lets the eye follow what moved. Reduced-motion
 * users get the raw value immediately.
 */
export function useTween(target: number, ms = 500) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    if (prefersReduced() || ms <= 0) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    const delta = target - a;
    if (Math.abs(delta) < 0.5) {
      from.current = target;
      setShown(target);
      return;
    }
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // ease-out-cubic: fast pickup, gentle landing
      const eased = 1 - Math.pow(1 - t, 3);
      const v = a + delta * eased;
      from.current = v;
      setShown(v);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);

  return shown;
}
