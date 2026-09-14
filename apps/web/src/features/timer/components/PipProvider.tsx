"use client";

import { useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { usePictureInPicture } from "../hooks/usePictureInPicture";
import { PipContext } from "../lib/pip-context";
import { PipContent } from "./PipContent";

/**
 * Owns the floating window, above every layout.
 *
 * It has to live at the root because the window must survive navigating
 * between the app shell and Focus. Previously this state sat in `TimerBar`,
 * which only mounts inside `AppShell` — so entering Focus unmounted it and its
 * cleanup closed the window. Popping out and then focusing killed the very
 * thing you had just popped out.
 *
 * `PipContent` is mounted only when a window exists, which keeps its queries
 * off the sign-in pages this provider also wraps.
 */
export function PipProvider({ children }: { children: ReactNode }) {
  const pip = usePictureInPicture();

  const value = useMemo(
    () => ({
      isSupported: pip.isSupported,
      isOpen: pip.isOpen,
      toggle: () => (pip.isOpen ? pip.close() : void pip.open()),
      close: pip.close,
    }),
    [pip],
  );

  return (
    <PipContext.Provider value={value}>
      {children}
      {pip.pipWindow && createPortal(<PipContent />, pip.pipWindow.document.body)}
    </PipContext.Provider>
  );
}
