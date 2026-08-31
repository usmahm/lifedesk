import { describe, expect, it } from "vitest";

import {
  addDays,
  asCalendarDay,
  calendarDayRange,
  compareDays,
  dayOfWeek,
  daysBetween,
  endOfWeek,
  startOfWeek,
  toCalendarDay,
  todayIn,
  weekDays,
} from "./calendar-day";

const day = asCalendarDay;

describe("toCalendarDay / todayIn", () => {
  it("resolves the day in the user's zone, not UTC", () => {
    // 03:30 UTC on the 31st is still the 30th in New York.
    const instant = new Date("2026-08-31T03:30:00Z");
    expect(toCalendarDay(instant, "UTC")).toBe("2026-08-31");
    expect(toCalendarDay(instant, "America/New_York")).toBe("2026-08-30");
    expect(toCalendarDay(instant, "Asia/Tokyo")).toBe("2026-08-31");
  });

  it("puts a late-evening London instant on the next day in Tokyo", () => {
    const instant = new Date("2026-08-30T23:00:00Z");
    expect(todayIn("Europe/London", instant)).toBe("2026-08-31"); // BST = UTC+1
    expect(todayIn("Asia/Tokyo", instant)).toBe("2026-08-31");
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-08-30");
  });
});

describe("addDays", () => {
  it("rolls over month and year boundaries", () => {
    expect(addDays(day("2026-08-31"), 1)).toBe("2026-09-01");
    expect(addDays(day("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(day("2026-01-01"), -1)).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(addDays(day("2028-02-28"), 1)).toBe("2028-02-29");
    expect(addDays(day("2028-02-29"), 1)).toBe("2028-03-01");
    expect(addDays(day("2026-02-28"), 1)).toBe("2026-03-01");
  });

  it("is unaffected by DST — a calendar day plus one is always the next day", () => {
    // UK clocks go forward on 2026-03-29 (a 23-hour day) and back on
    // 2026-10-25 (a 25-hour day). Neither may shift calendar arithmetic.
    expect(addDays(day("2026-03-28"), 1)).toBe("2026-03-29");
    expect(addDays(day("2026-03-29"), 1)).toBe("2026-03-30");
    expect(addDays(day("2026-10-24"), 1)).toBe("2026-10-25");
    expect(addDays(day("2026-10-25"), 1)).toBe("2026-10-26");
  });
});

describe("calendarDayRange", () => {
  it("spans exactly 24h on an ordinary day", () => {
    const { start, end } = calendarDayRange(day("2026-08-30"), "Europe/London");
    expect(start.toISOString()).toBe("2026-08-29T23:00:00.000Z"); // BST
    expect(end.getTime() - start.getTime()).toBe(24 * 3600 * 1000);
  });

  it("spans 23h on the spring-forward day", () => {
    const { start, end } = calendarDayRange(day("2026-03-29"), "Europe/London");
    expect(end.getTime() - start.getTime()).toBe(23 * 3600 * 1000);
  });

  it("spans 25h on the fall-back day", () => {
    const { start, end } = calendarDayRange(day("2026-10-25"), "Europe/London");
    expect(end.getTime() - start.getTime()).toBe(25 * 3600 * 1000);
  });

  it("brackets a session that starts before midnight and ends after it", () => {
    const tz = "Europe/London";
    const startedAt = new Date("2026-08-30T22:30:00Z"); // 23:30 local, the 30th
    const endedAt = new Date("2026-08-30T23:30:00Z"); // 00:30 local, the 31st

    const thirtieth = calendarDayRange(day("2026-08-30"), tz);
    expect(startedAt >= thirtieth.start && startedAt < thirtieth.end).toBe(true);
    expect(endedAt < thirtieth.end).toBe(false);

    expect(toCalendarDay(endedAt, tz)).toBe("2026-08-31");
  });
});

describe("startOfWeek", () => {
  it("respects the user's week start", () => {
    // 2026-08-30 is a Sunday.
    expect(dayOfWeek(day("2026-08-30"))).toBe(0);
    expect(startOfWeek(day("2026-08-30"), 1)).toBe("2026-08-24"); // Monday start
    expect(startOfWeek(day("2026-08-30"), 0)).toBe("2026-08-30"); // Sunday start
  });

  it("is idempotent", () => {
    const first = startOfWeek(day("2026-08-30"), 1);
    expect(startOfWeek(first, 1)).toBe(first);
  });

  it("produces a 7-day span", () => {
    expect(endOfWeek(day("2026-08-30"), 1)).toBe("2026-08-30");
    const days = weekDays(day("2026-08-30"), 1);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-24");
    expect(days[6]).toBe("2026-08-30");
  });
});

describe("comparison", () => {
  it("sorts lexicographically, which is also chronological", () => {
    const unsorted = [day("2026-09-01"), day("2026-08-30"), day("2026-08-31")];
    expect([...unsorted].sort(compareDays)).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
  });

  it("counts days across a DST boundary correctly", () => {
    expect(daysBetween(day("2026-03-28"), day("2026-03-30"))).toBe(2);
    expect(daysBetween(day("2026-10-24"), day("2026-10-26"))).toBe(2);
    expect(daysBetween(day("2026-08-31"), day("2026-08-30"))).toBe(-1);
  });
});

describe("asCalendarDay", () => {
  it("rejects anything that isn't YYYY-MM-DD", () => {
    expect(() => asCalendarDay("2026-8-30")).toThrow();
    expect(() => asCalendarDay("2026-08-30T00:00:00Z")).toThrow();
    expect(() => asCalendarDay("")).toThrow();
  });
});
