import { describe, expect, it } from "vitest";

import { estimateAccuracy, summarizeCapacity, type CapacityInput } from "./index";

const task = (estimateMin: number | null, status: CapacityInput["status"] = "todo") => ({
  estimateMin,
  status,
});

describe("summarizeCapacity", () => {
  it("counts only open tasks", () => {
    const summary = summarizeCapacity(
      [task(120), task(45, "doing"), task(90, "done"), task(30, "cancelled")],
      360,
    );

    expect(summary.plannedMin).toBe(165);
    expect(summary.openCount).toBe(2);
    expect(summary.remainingMin).toBe(195);
    expect(summary.isOver).toBe(false);
  });

  it("flags an over-planned day", () => {
    const summary = summarizeCapacity([task(300), task(180)], 360);

    expect(summary.plannedMin).toBe(480);
    expect(summary.ratio).toBeCloseTo(1.333, 3);
    expect(summary.isOver).toBe(true);
    // Over-capacity is expressed by isOver, never a negative remainder.
    expect(summary.remainingMin).toBe(0);
  });

  it("reports unestimated tasks, since the meter under-reports by that much", () => {
    const summary = summarizeCapacity([task(60), task(null), task(null)], 360);

    expect(summary.plannedMin).toBe(60);
    expect(summary.unestimatedCount).toBe(2);
    expect(summary.openCount).toBe(3);
  });

  it("handles an empty day", () => {
    const summary = summarizeCapacity([], 360);

    expect(summary.plannedMin).toBe(0);
    expect(summary.ratio).toBe(0);
    expect(summary.isOver).toBe(false);
    expect(summary.remainingMin).toBe(360);
  });

  it("does not divide by zero when capacity is unset", () => {
    expect(summarizeCapacity([task(60)], 0).ratio).toBe(0);
  });

  it("treats exactly at capacity as not over", () => {
    expect(summarizeCapacity([task(360)], 360).isOver).toBe(false);
  });
});

describe("estimateAccuracy", () => {
  it("reports how optimistic the estimates were", () => {
    // Estimated 3h in total, actually took 6h.
    const ratio = estimateAccuracy([
      { estimateMin: 60, trackedSec: 7200 },
      { estimateMin: 120, trackedSec: 14_400 },
    ]);

    expect(ratio).toBe(2);
  });

  it("returns 1 when calibrated", () => {
    expect(estimateAccuracy([{ estimateMin: 60, trackedSec: 3600 }])).toBe(1);
  });

  it("returns null rather than a made-up number when there is no usable data", () => {
    expect(estimateAccuracy([])).toBeNull();
    expect(estimateAccuracy([{ estimateMin: null, trackedSec: 3600 }])).toBeNull();
    expect(estimateAccuracy([{ estimateMin: 60, trackedSec: 0 }])).toBeNull();
  });

  it("ignores samples missing either side", () => {
    const ratio = estimateAccuracy([
      { estimateMin: 60, trackedSec: 7200 },
      { estimateMin: null, trackedSec: 99_999 },
      { estimateMin: 30, trackedSec: 0 },
    ]);

    expect(ratio).toBe(2);
  });
});
