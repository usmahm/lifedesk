import type { CalendarDay } from "@lifedesk/contracts";
import { formatInTimeZone } from "date-fns-tz";

import { addDays, isSameDay } from "./calendar-day";

/**
 * Rendering calendar days.
 *
 * A CalendarDay carries no zone, so it is formatted as UTC — the string is
 * already the user's local day, and re-projecting it into a zone would shift it.
 */

/** Noon anchor, matching calendar-day.ts. */
function anchor(day: CalendarDay): Date {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/** `Thursday, 30 August` — the Day view header. */
export function formatDay(day: CalendarDay, pattern = "EEEE, d MMMM"): string {
  return formatInTimeZone(anchor(day), "UTC", pattern);
}

/** `Thu 30` — week column headers. */
export function formatDayShort(day: CalendarDay): string {
  return formatDay(day, "EEE d");
}

/** `Thu` — the mobile day strip. */
export function formatWeekdayNarrow(day: CalendarDay): string {
  return formatDay(day, "EEE");
}

/** `30` — the day number alone. */
export function formatDayNumber(day: CalendarDay): string {
  return formatDay(day, "d");
}

/**
 * "Today" / "Tomorrow" / "Yesterday" within ±1 day, absolute beyond that.
 * Relative labels beyond one day stop being helpful and start being a puzzle.
 */
export function formatDayRelative(day: CalendarDay, today: CalendarDay): string {
  if (isSameDay(day, today)) return "Today";
  if (isSameDay(day, addDays(today, 1))) return "Tomorrow";
  if (isSameDay(day, addDays(today, -1))) return "Yesterday";
  return formatDay(day, "EEE d MMM");
}

/** `09:41` — clock time of an instant, in the user's zone. */
export function formatTimeOfDay(instant: Date, timezone: string): string {
  return formatInTimeZone(instant, timezone, "HH:mm");
}
