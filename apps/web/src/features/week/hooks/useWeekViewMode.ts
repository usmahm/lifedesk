"use client";

import { useCallback, useSyncExternalStore } from "react";

import { WEEK_VIEW_MODE_KEY, type WeekViewMode } from "../constants";

/**
 * List or timeline, remembered across visits.
 *
 * A per-viewer convenience, so it lives in localStorage rather than on the
 * server. Every access is guarded: storage throws outright in some contexts
 * (private windows, blocked site data) and the page must still render.
 */

const listeners = new Set<() => void>();

function read(): WeekViewMode {
  try {
    return localStorage.getItem(WEEK_VIEW_MODE_KEY) === "timeline" ? "timeline" : "list";
  } catch {
    return "list";
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keep two tabs in step.
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useWeekViewMode(): [WeekViewMode, (mode: WeekViewMode) => void] {
  const mode = useSyncExternalStore(
    subscribe,
    read,
    // List is the default, and the server has no storage to read.
    () => "list" as WeekViewMode,
  );

  const setMode = useCallback((next: WeekViewMode) => {
    try {
      localStorage.setItem(WEEK_VIEW_MODE_KEY, next);
    } catch {
      // Preference simply won't persist; the toggle still works this session.
    }
    for (const listener of listeners) listener();
  }, []);

  return [mode, setMode];
}
