"use client";

import { createContext } from "react";

export type PipContextValue = {
  /** False in Safari, desktop and iOS — the API does not exist there at all. */
  isSupported: boolean;
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

/**
 * Null outside the provider, so `usePip` can tell "not wrapped" from "closed"
 * and fail loudly rather than silently doing nothing.
 */
export const PipContext = createContext<PipContextValue | null>(null);
