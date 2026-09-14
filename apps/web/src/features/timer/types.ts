import type { BreakKind } from "@lifedesk/core/pomodoro";

/** Which clock the ▶ on a task starts. A per-browser preference. */
export type TimerMode = "timer" | "pomodoro";

/**
 * Where the cycle currently is.
 *
 * The two `-ended` states exist because nothing auto-starts: a phase that has
 * run out is not the same as nothing running, and the difference is what the
 * bar offers you next.
 */
export type PomodoroPhase = "idle" | "work" | "work-ended" | "break" | "break-ended";

/**
 * The half of the cycle that is not a server session.
 *
 * Breaks are local by design — a five-minute, single-device thing that would
 * otherwise double the Sessions list with rows nobody reads. `breakEndsAt` is
 * an absolute instant rather than a remaining count, so it survives a refresh
 * the same way `startedAt` does for the work phase.
 */
export type PomodoroCycle = {
  breakEndsAt: number | null;
  breakKind: BreakKind;
  /** Work phases finished today. Drives the long-break interval. */
  completedWorkPhases: number;
  /** A work phase ended and no break has been started yet. */
  awaitingBreak: boolean;
  /** The day `completedWorkPhases` belongs to, so it resets at midnight. */
  cycleDay: string;
  /**
   * What the last work phase was on, so the next one can start without
   * hunting for the task again. Nothing auto-starts — this only supplies the
   * button with something to start.
   */
  lastTaskId: string | null;
};
