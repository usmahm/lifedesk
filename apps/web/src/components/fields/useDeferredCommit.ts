"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Coalesces rapid commits into one write.
 *
 * `StepperSegment` commits on every arrow press, and a held arrow key
 * auto-repeats around thirty times a second — which was thirty mutations, and
 * thirty invalidations behind them. Typing and dragging were already fine
 * (they commit once, on completion or release); this is only about repeats.
 *
 * The pending write is flushed rather than dropped on unmount, so closing the
 * sheet immediately after nudging a value still saves it.
 */
export function useDeferredCommit(delayMs: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<(() => void) | null>(null);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const run = pending.current;
    pending.current = null;
    run?.();
  }, []);

  const schedule = useCallback(
    (run: () => void) => {
      pending.current = run;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => flush, [flush]);

  return { schedule, flush };
}
