"use client";

import { useEffect, useRef } from "react";

/**
 * Puts the running phase in the browser tab title.
 *
 * This is the fallback that carries Safari and iOS, where Document
 * Picture-in-Picture does not exist at all — and it is useful everywhere else
 * too, since a tab strip is visible more often than a floating window.
 *
 * Pass null when nothing is running and the original title comes back.
 */
export function useCountdownTitle(label: string | null): void {
  // What the title was before this run started. Captured per run rather than
  // once on mount: the label changes every second, so capturing on each change
  // would "restore" the previous countdown.
  const saved = useRef<string | null>(null);

  useEffect(() => {
    if (label === null) {
      if (saved.current !== null) {
        document.title = saved.current;
        saved.current = null;
      }
      return;
    }

    saved.current ??= document.title;
    document.title = label;
  }, [label]);

  useEffect(
    () => () => {
      if (saved.current !== null) document.title = saved.current;
    },
    [],
  );
}
