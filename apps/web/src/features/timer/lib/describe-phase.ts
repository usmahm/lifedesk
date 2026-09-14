import type { PomodoroPhase } from "../types";

/**
 * The phase label, in one place.
 *
 * Three surfaces render it — the timer bar, the Focus screen and the floating
 * window — and they have to agree. It lived in two of them independently
 * before this, which is exactly how the third would have drifted.
 */
export function describePhase(
  phase: PomodoroPhase,
  position: number,
  longBreakEvery: number,
): string {
  switch (phase) {
    case "work":
      return `Work · ${position} of ${longBreakEvery}`;
    case "work-ended":
      return "Phase done — take a break";
    case "break":
      return "Break";
    case "break-ended":
      return "Break over";
    default:
      return "";
  }
}
