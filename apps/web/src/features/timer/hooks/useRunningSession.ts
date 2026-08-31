"use client";

import { clockSkewMs, elapsedSecondsAtMs } from "@lifedesk/core/time";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

import { browserNow } from "@/lib/clock";
import { orpc } from "@/lib/orpc/client";

import { ELAPSED_TICK_MS, RUNNING_SESSION_REFETCH_MS } from "../constants";

/**
 * The running session, and how long it has been running.
 *
 * The elapsed value is always DERIVED from `startedAt` — never accumulated.
 * That's what makes the timer survive a refresh, a closed tab, a sleeping
 * laptop, and a second device.
 *
 * The ticking clock is modelled as an external store rather than a `setState`
 * interval: a wall clock genuinely is an external system, and
 * `useSyncExternalStore` keeps the render pure and SSR-safe.
 * See .claude/rules/dates-and-timezones.md.
 */

function createCorrectedClock(intervalMs: number) {
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  let skewMs = 0;
  /** Rounded to the second so the snapshot is stable within a tick. */
  let snapshot = 0;

  function read(): number {
    return Math.floor((browserNow().getTime() + skewMs) / 1000) * 1000;
  }

  function publish(): void {
    const next = read();
    if (next === snapshot) return;
    snapshot = next;
    for (const listener of listeners) listener();
  }

  return {
    /** Called from an effect — updating an external system, not React state. */
    setSkew(ms: number): void {
      if (ms === skewMs) return;
      skewMs = ms;
      publish();
    },

    subscribe(onChange: () => void): () => void {
      listeners.add(onChange);

      if (listeners.size === 1) {
        snapshot = read();
        timer = setInterval(publish, intervalMs);
        // A tab that slept for six hours must not show a stale value until
        // its next tick.
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

    getSnapshot(): number {
      return snapshot || (snapshot = read());
    },

    /** No clock on the server — elapsed renders as 0 and corrects on hydration. */
    getServerSnapshot(): number {
      return 0;
    },
  };
}

const clock = createCorrectedClock(ELAPSED_TICK_MS);

export function useRunningSession() {
  return useQuery(
    orpc.session.running.queryOptions({
      // A slow poll catches a session started on another device.
      refetchInterval: RUNNING_SESSION_REFETCH_MS,
    }),
  );
}

/**
 * Seconds elapsed, corrected for a wrong local clock.
 *
 * The server reports its own `now` alongside the session; the offset is
 * pushed into the clock store and applied to every subsequent local read, so
 * a user whose laptop is twenty minutes fast still sees the right number.
 */
export function useElapsedSeconds(startedAt: Date | null, serverNow: Date | null): number {
  const correctedNowMs = useSyncExternalStore(
    clock.subscribe,
    clock.getSnapshot,
    clock.getServerSnapshot,
  );

  useEffect(() => {
    if (serverNow) clock.setSkew(clockSkewMs(serverNow, browserNow()));
  }, [serverNow]);

  if (!startedAt || correctedNowMs === 0) return 0;

  return elapsedSecondsAtMs(startedAt, correctedNowMs);
}
