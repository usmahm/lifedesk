/**
 * Durations are integer seconds everywhere in the system. Formatting happens
 * only at the render edge. See .claude/rules/dates-and-timezones.md.
 */

/**
 * A session running longer than this is almost certainly a timer someone
 * forgot to stop. It gets flagged for review rather than silently logging
 * fourteen hours of "deep work".
 */
export const RUNAWAY_SESSION_HOURS = 8;

const SECONDS_PER_HOUR = 3600;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Elapsed seconds for a running session, always derived from `startedAt`.
 *
 * Never accumulate elapsed time in a client interval: it drifts, resets on
 * refresh, and silently loses time when the tab sleeps. An interval may drive
 * the re-render, but the value it shows is recomputed from this.
 */
export function elapsedSeconds(startedAt: Date, now: Date): number {
  return elapsedSecondsAtMs(startedAt, now.getTime());
}

/**
 * Same, against a raw epoch-milliseconds reading.
 *
 * Lets a ticking clock feed the timer without constructing a Date on every
 * frame — and without any caller needing to.
 */
export function elapsedSecondsAtMs(startedAt: Date, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 1000));
}

/** Human-readable: `2h 15m`, `45m`, `1h`. For totals and estimates. */
export function formatDuration(seconds: number): string {
  const totalMin = Math.round(Math.max(0, seconds) / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDurationMinutes(minutes: number): string {
  return formatDuration(minutes * 60);
}

/**
 * Clock face for the running timer: `00:42:17`. Always rendered with
 * `tabular-nums` — proportional digits make it jitter on every tick.
 */
export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / SECONDS_PER_HOUR))}:${pad(Math.floor((s % SECONDS_PER_HOUR) / 60))}:${pad(s % 60)}`;
}

export function isRunawaySession(startedAt: Date, endedAt: Date): boolean {
  return elapsedSeconds(startedAt, endedAt) > RUNAWAY_SESSION_HOURS * SECONDS_PER_HOUR;
}

/**
 * Corrects for a wrong system clock.
 *
 * The server's time is sampled once alongside the running session; the offset
 * is applied to every subsequent local read, so a user whose laptop clock is
 * twenty minutes fast still sees the correct elapsed time.
 */
export function skewCorrectedNow(localNow: Date, skewMs: number): Date {
  return new Date(localNow.getTime() + skewMs);
}

export function clockSkewMs(serverNow: Date, localNow: Date): number {
  return serverNow.getTime() - localNow.getTime();
}
