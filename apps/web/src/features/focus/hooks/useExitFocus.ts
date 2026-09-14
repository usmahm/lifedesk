"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

import { FOCUS_FALLBACK_PATH, FOCUS_ORIGIN_PARAM } from "../constants";

/**
 * Leaving Focus, and getting back somewhere sensible.
 *
 * The entry point navigates with `?from=<path>`, which is a marker that the
 * navigation came from inside the app. When it is there, `router.back()` is the
 * better exit — it keeps scroll position and avoids a refetch. Without it (a
 * direct load, a bookmark, a refresh followed by an exit) there is nothing
 * behind us in the app, so pushing is the only safe move.
 *
 * `window.history.length` is not consulted on purpose: it counts entries from
 * before this app was ever loaded, so it cannot tell "came from Today" from
 * "opened in a fresh tab after browsing elsewhere".
 */
export function useExitFocus(): () => void {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get(FOCUS_ORIGIN_PARAM);

  const exit = useCallback(() => {
    if (from) {
      router.back();
      return;
    }
    router.push(FOCUS_FALLBACK_PATH);
  }, [from, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") exit();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [exit]);

  return exit;
}
