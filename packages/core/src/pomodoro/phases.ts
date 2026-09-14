/**
 * Pomodoro phase arithmetic.
 *
 * Small, and here rather than in a component because the long-break interval
 * has a genuine off-by-one in it: "every 4" means the break *after* the 4th
 * work phase is long, not the 4th break. Getting that wrong is invisible until
 * someone counts, and by then it has been wrong for weeks.
 */

export type BreakKind = "short" | "long";

/**
 * Which break follows a work phase.
 *
 * `completedWorkPhases` counts phases already finished *including* the one
 * that just ended, so after the first work phase it is 1.
 */
export function nextBreakKind(completedWorkPhases: number, longBreakEvery: number): BreakKind {
  if (completedWorkPhases <= 0 || longBreakEvery <= 0) return "short";
  return completedWorkPhases % longBreakEvery === 0 ? "long" : "short";
}

/**
 * Seconds left in a phase, never negative.
 *
 * Clamped because every caller renders this — a phase that overran by three
 * seconds should read 00:00, not -00:03.
 */
export function remainingSeconds(targetSec: number, elapsedSec: number): number {
  return Math.max(0, Math.ceil(targetSec - elapsedSec));
}

/**
 * Position within the cycle, for the "work · 2 of 4" label.
 *
 * One-based, so the phase in progress reads as the 1st rather than the 0th,
 * and it wraps rather than climbing forever.
 */
export function cyclePosition(completedWorkPhases: number, longBreakEvery: number): number {
  if (longBreakEvery <= 0) return 1;
  return (Math.max(0, completedWorkPhases) % longBreakEvery) + 1;
}
