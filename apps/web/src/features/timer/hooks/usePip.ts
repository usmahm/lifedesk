"use client";

import { useContext } from "react";

import { PipContext, type PipContextValue } from "../lib/pip-context";

/** The floating window, from anywhere inside `PipProvider`. */
export function usePip(): PipContextValue {
  const value = useContext(PipContext);
  if (!value) throw new Error("usePip must be used inside PipProvider");
  return value;
}
