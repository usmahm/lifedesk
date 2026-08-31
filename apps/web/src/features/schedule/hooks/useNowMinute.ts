"use client";

import { minuteOfDayAtMs } from "@lifedesk/core/time";
import { useSyncExternalStore } from "react";

import { browserNow } from "@/lib/clock";

import { NOW_LINE_TICK_MS } from "../constants";

/**
 * The current minute of the day, for the now-line.
 *
 * A ticking clock is an external system, so `useSyncExternalStore` rather than
 * a `setState` interval — same reasoning as the timer in
 * `features/timer/hooks/useRunningSession.ts`, and it keeps render pure.
 *
 * Snapshot is a raw epoch reading rounded to the tick, so it is stable between
 * ticks; the timezone conversion happens outside the store, since the zone is
 * a React value rather than part of the clock.
 */
function createMinuteClock(intervalMs: number) {
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  let snapshot = 0;

  function read(): number {
    return Math.floor(browserNow().getTime() / intervalMs) * intervalMs;
  }

  function publish(): void {
    const next = read();
    if (next === snapshot) return;
    snapshot = next;
    for (const listener of listeners) listener();
  }

  return {
    subscribe(onChange: () => void): () => void {
      listeners.add(onChange);

      if (listeners.size === 1) {
        snapshot = read();
        timer = setInterval(publish, intervalMs);
        document.addEventListener("visibilitychange", publish);
      }

      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          clearInterval(timer);
          document.removeEventListener("visibilitychange", publish);
        }
      };
    },
    getSnapshot: (): number => snapshot || (snapshot = read()),
    /** No clock on the server; the line appears after hydration. */
    getServerSnapshot: (): number => 0,
  };
}

const clock = createMinuteClock(NOW_LINE_TICK_MS);

export function useNowMinute(timezone: string | undefined): number | null {
  const epochMs = useSyncExternalStore(
    clock.subscribe,
    clock.getSnapshot,
    clock.getServerSnapshot,
  );

  if (!timezone || epochMs === 0) return null;

  return minuteOfDayAtMs(epochMs, timezone);
}
