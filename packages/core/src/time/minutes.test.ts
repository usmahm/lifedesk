import { describe, expect, it } from "vitest";

import {
  clampMinuteOfDay,
  formatMinuteOfDay,
  hoursInWindow,
  joinMinutes,
  minuteToOffsetPct,
  parseMinuteOfDay,
  spanToHeightPct,
  splitMinutes,
  toClockTime,
} from "./minutes";

describe("formatMinuteOfDay", () => {
  it("zero-pads so times line up in a column", () => {
    expect(formatMinuteOfDay(540)).toBe("09:00");
    expect(formatMinuteOfDay(0)).toBe("00:00");
    expect(formatMinuteOfDay(65)).toBe("01:05");
    expect(formatMinuteOfDay(1439)).toBe("23:59");
  });

  it("renders end-of-day as 24:00", () => {
    expect(formatMinuteOfDay(1440)).toBe("24:00");
  });

  it("clamps rather than wrapping", () => {
    expect(formatMinuteOfDay(-30)).toBe("00:00");
    expect(formatMinuteOfDay(2000)).toBe("24:00");
  });
});

describe("parseMinuteOfDay", () => {
  it("reads a clock time", () => {
    expect(parseMinuteOfDay("09:00")).toBe(540);
    expect(parseMinuteOfDay("9:00")).toBe(540);
    expect(parseMinuteOfDay("23:59")).toBe(1439);
    expect(parseMinuteOfDay("00:00")).toBe(0);
  });

  it("accepts 24:00 as end of day", () => {
    expect(parseMinuteOfDay("24:00")).toBe(1440);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseMinuteOfDay("  09:30 ")).toBe(570);
  });

  it("returns null rather than throwing on partial input", () => {
    // A time field validates on every keystroke; half-typed input is normal.
    expect(parseMinuteOfDay("")).toBeNull();
    expect(parseMinuteOfDay("9")).toBeNull();
    expect(parseMinuteOfDay("09:")).toBeNull();
    expect(parseMinuteOfDay("nonsense")).toBeNull();
  });

  it("rejects impossible times", () => {
    expect(parseMinuteOfDay("09:60")).toBeNull();
    expect(parseMinuteOfDay("25:00")).toBeNull();
    expect(parseMinuteOfDay("24:30")).toBeNull();
  });

  it("round-trips with formatMinuteOfDay", () => {
    for (const minute of [0, 1, 59, 60, 540, 719, 1439, 1440]) {
      expect(parseMinuteOfDay(formatMinuteOfDay(minute))).toBe(minute);
    }
  });
});

describe("clampMinuteOfDay", () => {
  it("keeps values inside the day", () => {
    expect(clampMinuteOfDay(-5)).toBe(0);
    expect(clampMinuteOfDay(9999)).toBe(1440);
    expect(clampMinuteOfDay(540.6)).toBe(541);
  });

  it("survives NaN", () => {
    expect(clampMinuteOfDay(Number.NaN)).toBe(0);
  });
});

describe("splitMinutes / joinMinutes", () => {
  it("splits at the boundaries that actually catch people out", () => {
    expect(splitMinutes(0)).toEqual({ hours: 0, minutes: 0 });
    expect(splitMinutes(59)).toEqual({ hours: 0, minutes: 59 });
    expect(splitMinutes(60)).toEqual({ hours: 1, minutes: 0 });
    expect(splitMinutes(90)).toEqual({ hours: 1, minutes: 30 });
    expect(splitMinutes(135)).toEqual({ hours: 2, minutes: 15 });
    expect(splitMinutes(1439)).toEqual({ hours: 23, minutes: 59 });
    // A full day is 24h 0m, never 0h.
    expect(splitMinutes(1440)).toEqual({ hours: 24, minutes: 0 });
  });

  it("clamps rather than producing negative parts", () => {
    expect(splitMinutes(-30)).toEqual({ hours: 0, minutes: 0 });
    expect(joinMinutes(-1, -30)).toBe(0);
  });

  it("survives NaN from a half-typed field", () => {
    expect(splitMinutes(Number.NaN)).toEqual({ hours: 0, minutes: 0 });
    expect(joinMinutes(Number.NaN, 30)).toBe(30);
    expect(joinMinutes(2, Number.NaN)).toBe(120);
  });

  it("joins minute overflow into the hour", () => {
    // A segment can hand back 90 minutes mid-edit; it must not be lost.
    expect(joinMinutes(1, 90)).toBe(150);
    expect(splitMinutes(joinMinutes(1, 90))).toEqual({ hours: 2, minutes: 30 });
  });

  it("round-trips across the whole range", () => {
    for (let total = 0; total <= 1440; total += 7) {
      const { hours, minutes } = splitMinutes(total);
      expect(joinMinutes(hours, minutes)).toBe(total);
    }
  });
});

describe("toClockTime", () => {
  it("produces the form instantAt expects", () => {
    expect(toClockTime(540)).toBe("09:00");
  });
});

describe("positioning", () => {
  const window = { startMin: 360, endMin: 1380 }; // 06:00–23:00, 17h

  it("places a minute proportionally inside the window", () => {
    expect(minuteToOffsetPct(360, window)).toBe(0);
    expect(minuteToOffsetPct(1380, window)).toBe(100);
    expect(minuteToOffsetPct(870, window)).toBeCloseTo(50, 5);
  });

  it("sizes a span proportionally", () => {
    // One hour of a seventeen-hour window.
    expect(spanToHeightPct(540, 600, window)).toBeCloseTo((60 / 1020) * 100, 5);
  });

  it("never returns a negative height", () => {
    expect(spanToHeightPct(600, 540, window)).toBe(0);
  });

  it("does not divide by zero on a collapsed window", () => {
    const collapsed = { startMin: 600, endMin: 600 };
    expect(minuteToOffsetPct(600, collapsed)).toBe(0);
    expect(spanToHeightPct(600, 660, collapsed)).toBe(0);
  });
});

describe("hoursInWindow", () => {
  it("lists the whole hours the axis should label", () => {
    expect(hoursInWindow({ startMin: 360, endMin: 540 })).toEqual([6, 7, 8, 9]);
  });

  it("only includes hours fully inside a ragged window", () => {
    expect(hoursInWindow({ startMin: 370, endMin: 530 })).toEqual([7, 8]);
  });

  it("covers the whole day", () => {
    expect(hoursInWindow({ startMin: 0, endMin: 1440 })).toHaveLength(25);
  });
});
