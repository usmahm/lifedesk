/**
 * Minute-of-day arithmetic.
 *
 * A planned block is a wall-clock intent — "09:00 on Thursday" means 09:00
 * wherever you are. Storing it as minutes from local midnight, paired with a
 * CalendarDay, makes that timezone-safe by construction: nothing to convert,
 * nothing to drift when you travel or when the clocks change.
 *
 * Contrast with an instant, which is a moment on the world clock. Never store
 * a plan as one. See .claude/rules/dates-and-timezones.md.
 */

export const MINUTES_PER_DAY = 1440;

const MINUTE_OF_DAY_PATTERN = /^(\d{1,2}):(\d{2})$/;

/** `540` → `"09:00"`. Always zero-padded, so it lines up in a column. */
export function formatMinuteOfDay(minuteOfDay: number): string {
  const clamped = clampMinuteOfDay(minuteOfDay);
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * `"09:00"` → `540`. Returns null on anything unparseable, so a half-typed
 * time input doesn't throw on every keystroke.
 *
 * `"24:00"` is accepted as end-of-day (1440); it is only ever valid as an end.
 */
export function parseMinuteOfDay(value: string): number | null {
  const match = MINUTE_OF_DAY_PATTERN.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (minutes > 59) return null;
  if (hours > 24) return null;
  if (hours === 24 && minutes !== 0) return null;

  return hours * 60 + minutes;
}

export function clampMinuteOfDay(minuteOfDay: number): number {
  if (!Number.isFinite(minuteOfDay)) return 0;
  return Math.min(MINUTES_PER_DAY, Math.max(0, Math.round(minuteOfDay)));
}

/** The `"HH:mm"` form `instantAt` expects, for converting a block to a UTC instant. */
export function toClockTime(minuteOfDay: number): `${number}:${number}` {
  return formatMinuteOfDay(minuteOfDay) as `${number}:${number}`;
}

export type DayWindow = { startMin: number; endMin: number };

/**
 * Where a minute sits inside a visible window, as a percentage.
 *
 * The grid positions blocks with percentages rather than pixels so the column
 * can be any height and still line up with the axis.
 */
export function minuteToOffsetPct(minuteOfDay: number, window: DayWindow): number {
  const span = window.endMin - window.startMin;
  if (span <= 0) return 0;
  return ((minuteOfDay - window.startMin) / span) * 100;
}

/** Height of a span as a percentage of the visible window. */
export function spanToHeightPct(startMin: number, endMin: number, window: DayWindow): number {
  const span = window.endMin - window.startMin;
  if (span <= 0) return 0;
  return Math.max(0, ((endMin - startMin) / span) * 100);
}

/** Whole hours inside a window, for drawing the axis. */
export function hoursInWindow(window: DayWindow): number[] {
  const first = Math.ceil(window.startMin / 60);
  const last = Math.floor(window.endMin / 60);

  const hours: number[] = [];
  for (let hour = first; hour <= last; hour += 1) hours.push(hour);
  return hours;
}
