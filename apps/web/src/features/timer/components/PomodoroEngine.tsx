"use client";

import { usePomodoro } from "../hooks/usePomodoro";

/**
 * The single driver of the Pomodoro cycle. Renders nothing.
 *
 * `usePomodoro` is read from several places at once — the timer bar, the Focus
 * screen, the floating window — but its side effects must run exactly once.
 * Stopping the session at its target and incrementing the cycle are not
 * idempotent: two drivers would count one phase twice and race each other's
 * writes to storage.
 *
 * Mounted once per authed layout. The two authed layouts are mutually
 * exclusive, so exactly one of these exists at any time.
 */
export function PomodoroEngine() {
  usePomodoro({ drive: true });
  return null;
}
