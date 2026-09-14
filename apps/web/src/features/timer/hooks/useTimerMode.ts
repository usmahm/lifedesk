"use client";

import { useCallback, useSyncExternalStore } from "react";

import { TIMER_MODE_KEY } from "../constants";
import type { TimerMode } from "../types";

/**
 * Timer or Pomodoro, remembered across visits.
 *
 * A per-viewer preference, so localStorage rather than the server — and the
 * reason `TaskRow` keeps a single ▶: the decision is made once here instead of
 * on every task. Same shape as `useWeekViewMode`.
 */

const listeners = new Set<() => void>();

function read(): TimerMode {
  try {
    return localStorage.getItem(TIMER_MODE_KEY) === "pomodoro" ? "pomodoro" : "timer";
  } catch {
    return "timer";
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useTimerMode(): [TimerMode, (mode: TimerMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => "timer" as TimerMode);

  const setMode = useCallback((next: TimerMode) => {
    try {
      localStorage.setItem(TIMER_MODE_KEY, next);
    } catch {
      // Won't persist; the toggle still works this session.
    }
    for (const listener of listeners) listener();
  }, []);

  return [mode, setMode];
}
