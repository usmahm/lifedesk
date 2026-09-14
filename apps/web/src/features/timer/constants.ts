/** Drives the re-render only — the displayed value is recomputed from `startedAt`. */
export const ELAPSED_TICK_MS = 1000;

/** Slow poll, so a session started on another device shows up here. */
export const RUNNING_SESSION_REFETCH_MS = 60_000;

export const TIMER_MODE_KEY = "lifedesk.timer-mode";
export const POMODORO_CYCLE_KEY = "lifedesk.pomodoro-cycle";

/** Small enough to sit beside an editor, big enough for a 40px clock face. */
export const PIP_WINDOW_SIZE = { width: 320, height: 190 };

/** Two-tone chime, generated rather than shipped as an asset. */
export const CHIME = {
  /** A rising pair to end work, a falling pair to end a break. */
  workEndHz: [660, 880],
  breakEndHz: [880, 660],
  toneMs: 140,
  gain: 0.07,
} as const;
