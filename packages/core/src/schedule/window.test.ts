import { describe, expect, it } from "vitest";

import type { ScheduleItem } from "./layout";
import { DEFAULT_WINDOW, dayWindow, dayWindowIncluding } from "./window";

const at = (startMin: number, endMin: number): ScheduleItem => ({
  id: `${startMin}-${endMin}`,
  startMin,
  endMin,
});

describe("dayWindow", () => {
  it("uses the default for an empty day", () => {
    expect(dayWindow([])).toEqual(DEFAULT_WINDOW);
  });

  it("does not shrink to fit content", () => {
    // A single midday block must not collapse the axis around itself — the
    // rest of the day still needs to be visible to plan into.
    expect(dayWindow([at(660, 720)])).toEqual(DEFAULT_WINDOW);
  });

  it("expands down for an early block, snapping to the hour", () => {
    // 05:30 start → axis opens at 05:00, not 05:30.
    expect(dayWindow([at(330, 480)])).toEqual({ startMin: 300, endMin: DEFAULT_WINDOW.endMin });
  });

  it("expands up for a late block, snapping to the hour", () => {
    // 23:40 end → axis closes at 24:00.
    expect(dayWindow([at(1380, 1420)])).toEqual({
      startMin: DEFAULT_WINDOW.startMin,
      endMin: 1440,
    });
  });

  it("expands in both directions at once", () => {
    expect(dayWindow([at(300, 360), at(1350, 1400)])).toEqual({ startMin: 300, endMin: 1440 });
  });

  it("never runs past the ends of the day", () => {
    const window = dayWindow([at(0, 1440)]);
    expect(window.startMin).toBe(0);
    expect(window.endMin).toBe(1440);
  });

  it("ignores zero-length blocks when sizing", () => {
    expect(dayWindow([at(60, 60)])).toEqual(DEFAULT_WINDOW);
  });

  it("honours a caller-supplied default", () => {
    expect(dayWindow([], { startMin: 480, endMin: 1080 })).toEqual({
      startMin: 480,
      endMin: 1080,
    });
  });

  it("enforces a minimum span so the grid never becomes a sliver", () => {
    const window = dayWindow([], { startMin: 600, endMin: 660 });
    expect(window.endMin - window.startMin).toBe(6 * 60);
  });
});

describe("dayWindowIncluding", () => {
  it("opens the axis early enough to show the current time", () => {
    // 04:20 now, nothing blocked → the now-line must still be on screen.
    expect(dayWindowIncluding([], 260)).toEqual({
      startMin: 240,
      endMin: DEFAULT_WINDOW.endMin,
    });
  });

  it("extends the axis late enough to show the current time", () => {
    expect(dayWindowIncluding([], 1430)).toEqual({
      startMin: DEFAULT_WINDOW.startMin,
      endMin: 1440,
    });
  });

  it("leaves a window that already contains the moment alone", () => {
    expect(dayWindowIncluding([], 720)).toEqual(DEFAULT_WINDOW);
  });

  it("combines with block-driven expansion", () => {
    expect(dayWindowIncluding([at(1350, 1400)], 300)).toEqual({ startMin: 300, endMin: 1440 });
  });
});
