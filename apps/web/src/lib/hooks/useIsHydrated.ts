"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * True only after hydration.
 *
 * For the handful of things that genuinely cannot be known during server
 * render — the resolved theme, `window` measurements. Using an external store
 * rather than a `useState` + `useEffect` flag keeps render pure and avoids the
 * cascading re-render that pattern causes.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
