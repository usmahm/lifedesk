import type { CalendarDay } from "@lifedesk/contracts";
import type { WeekStartsOn } from "@lifedesk/contracts";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Calendar-day arithmetic.
 *
 * A CalendarDay is a day in the *user's* calendar — "Thursday" — with no time
 * and no zone. It is never a timestamp at midnight, because in UTC-5 that
 * renders as Wednesday evening.
 *
 * All arithmetic here is anchored to UTC noon, which sidesteps DST entirely:
 * a calendar day plus one is always the next calendar day, even on a day that
 * is 23 or 25 hours long.
 *
 * This module is the only place in the repo allowed to construct a Date.
 * See .claude/rules/dates-and-timezones.md.
 */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Anchored at noon so a ±1h DST shift can never roll into an adjacent day. */
function parseDayAsUtcNoon(day: CalendarDay): Date {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

function toDayString(utcAnchored: Date): CalendarDay {
  const y = utcAnchored.getUTCFullYear();
  const m = String(utcAnchored.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcAnchored.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}` as CalendarDay;
}

/** Narrow a raw string to a CalendarDay. Throws on anything else. */
export function asCalendarDay(value: string): CalendarDay {
  if (!DAY_PATTERN.test(value)) {
    throw new Error(`Not a calendar day: ${value}`);
  }
  return value as CalendarDay;
}

/** Which calendar day an instant falls on, in the given zone. */
export function toCalendarDay(instant: Date, timezone: string): CalendarDay {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd") as CalendarDay;
}

/**
 * Today in the user's zone.
 *
 * `now` is always passed in — never read from a clock — so every caller is
 * testable and server and client agree.
 */
export function todayIn(timezone: string, now: Date): CalendarDay {
  return toCalendarDay(now, timezone);
}

/**
 * The UTC instant range covering a calendar day in the given zone:
 * `[start, end)`. Correct across DST, where a day may be 23 or 25 hours.
 */
export function calendarDayRange(
  day: CalendarDay,
  timezone: string,
): { start: Date; end: Date } {
  return {
    start: fromZonedTime(`${day}T00:00:00`, timezone),
    end: fromZonedTime(`${addDays(day, 1)}T00:00:00`, timezone),
  };
}

/**
 * The UTC instant of a wall-clock time on a given day, in the given zone.
 *
 * This is what manual session entry needs: the user picks "the 30th, 14:30"
 * and means 14:30 where they are.
 */
export function instantAt(day: CalendarDay, time: `${number}:${number}`, timezone: string): Date {
  return fromZonedTime(`${day}T${time.padStart(5, "0")}:00`, timezone);
}

/**
 * Boundary helpers for calendar widgets, which speak in local `Date` objects.
 *
 * Use these ONLY at the edge of such a widget. Everywhere else a day stays a
 * CalendarDay — the moment one becomes a Date it starts drifting across zones.
 */
export function calendarDayToLocalDate(day: CalendarDay): Date {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  // Local midday, so no timezone offset can push it to an adjacent day.
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function localDateToCalendarDay(date: Date): CalendarDay {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` as CalendarDay;
}

export function addDays(day: CalendarDay, amount: number): CalendarDay {
  const d = parseDayAsUtcNoon(day);
  d.setUTCDate(d.getUTCDate() + amount);
  return toDayString(d);
}

/** Negative when `a` is earlier. Safe to use directly as a sort comparator. */
export function compareDays(a: CalendarDay, b: CalendarDay): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBeforeDay(a: CalendarDay, b: CalendarDay): boolean {
  return a < b;
}

export function isSameDay(a: CalendarDay, b: CalendarDay): boolean {
  return a === b;
}

export function daysBetween(from: CalendarDay, to: CalendarDay): number {
  const ms = parseDayAsUtcNoon(to).getTime() - parseDayAsUtcNoon(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** `weekStartsOn` is a user setting — never hardcode Monday. */
export function startOfWeek(day: CalendarDay, weekStartsOn: WeekStartsOn): CalendarDay {
  const dow = parseDayAsUtcNoon(day).getUTCDay();
  return addDays(day, -((dow - weekStartsOn + 7) % 7));
}

export function endOfWeek(day: CalendarDay, weekStartsOn: WeekStartsOn): CalendarDay {
  return addDays(startOfWeek(day, weekStartsOn), 6);
}

/** The seven days of the week containing `day`, in order. */
export function weekDays(day: CalendarDay, weekStartsOn: WeekStartsOn): CalendarDay[] {
  const start = startOfWeek(day, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(day: CalendarDay): CalendarDay {
  return `${day.slice(0, 7)}-01` as CalendarDay;
}

/** Day of week for a calendar day: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(day: CalendarDay): number {
  return parseDayAsUtcNoon(day).getUTCDay();
}

export function isWeekend(day: CalendarDay): boolean {
  const dow = dayOfWeek(day);
  return dow === 0 || dow === 6;
}
