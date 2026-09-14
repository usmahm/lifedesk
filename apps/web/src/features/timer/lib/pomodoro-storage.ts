"use client";

import type { BreakKind } from "@lifedesk/core/pomodoro";

import { POMODORO_CYCLE_KEY } from "../constants";
import type { PomodoroCycle } from "../types";

/**
 * The cycle state, as an external store over localStorage.
 *
 * Every access is guarded: storage throws outright in a private window or with
 * site data blocked, and the timer must still work for that session even if it
 * cannot be remembered.
 */

export const EMPTY_CYCLE: PomodoroCycle = {
  breakEndsAt: null,
  breakKind: "short",
  completedWorkPhases: 0,
  awaitingBreak: false,
  cycleDay: "",
  lastTaskId: null,
};

const listeners = new Set<() => void>();

/**
 * The parsed value is cached against the raw string it came from.
 *
 * `useSyncExternalStore` compares snapshots by identity. Parsing the JSON on
 * every call would hand React a fresh object each time and re-render forever,
 * which is the trap this whole file exists to avoid.
 */
let rawCache: string | null = null;
let snapshot: PomodoroCycle = EMPTY_CYCLE;

function isBreakKind(value: unknown): value is BreakKind {
  return value === "short" || value === "long";
}

/** Hand-validated rather than Zod: this is local UI state, not a contract. */
function coerce(raw: string): PomodoroCycle {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_CYCLE;

    const value = parsed as Record<string, unknown>;

    return {
      breakEndsAt: typeof value.breakEndsAt === "number" ? value.breakEndsAt : null,
      breakKind: isBreakKind(value.breakKind) ? value.breakKind : "short",
      completedWorkPhases:
        typeof value.completedWorkPhases === "number" && value.completedWorkPhases >= 0
          ? Math.floor(value.completedWorkPhases)
          : 0,
      awaitingBreak: value.awaitingBreak === true,
      cycleDay: typeof value.cycleDay === "string" ? value.cycleDay : "",
      lastTaskId: typeof value.lastTaskId === "string" ? value.lastTaskId : null,
    };
  } catch {
    // Corrupt or hand-edited — start clean rather than crash the timer.
    return EMPTY_CYCLE;
  }
}

export function readCycle(): PomodoroCycle {
  let raw: string | null;
  try {
    raw = localStorage.getItem(POMODORO_CYCLE_KEY);
  } catch {
    return EMPTY_CYCLE;
  }

  if (raw === rawCache) return snapshot;

  rawCache = raw;
  snapshot = raw === null ? EMPTY_CYCLE : coerce(raw);
  return snapshot;
}

/** No storage on the server, and the value must be identity-stable. */
export function readServerCycle(): PomodoroCycle {
  return EMPTY_CYCLE;
}

export function writeCycle(next: PomodoroCycle): void {
  try {
    localStorage.setItem(POMODORO_CYCLE_KEY, JSON.stringify(next));
  } catch {
    // Won't persist across a reload; the cycle still works this session.
  }
  // Update the cache directly too: a blocked write must not leave the UI
  // reading a stale snapshot for the rest of the session.
  rawCache = JSON.stringify(next);
  snapshot = next;

  for (const listener of listeners) listener();
}

export function subscribeCycle(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keep two tabs in step.
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
