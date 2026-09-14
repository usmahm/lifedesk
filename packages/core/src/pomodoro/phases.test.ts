import { describe, expect, it } from "vitest";

import { cyclePosition, nextBreakKind, remainingSeconds } from "./phases";

describe("nextBreakKind", () => {
  it("makes the break after every 4th work phase long", () => {
    const kinds = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => nextBreakKind(n, 4));

    // The long break follows the 4th and the 8th — not the 5th, which is the
    // off-by-one this exists to pin down.
    expect(kinds).toEqual(["short", "short", "short", "long", "short", "short", "short", "long"]);
  });

  it("honours a different interval", () => {
    expect([1, 2, 3, 4].map((n) => nextBreakKind(n, 2))).toEqual([
      "short",
      "long",
      "short",
      "long",
    ]);
  });

  it("is short before any work phase has finished", () => {
    expect(nextBreakKind(0, 4)).toBe("short");
  });

  it("does not divide by a nonsense interval", () => {
    expect(nextBreakKind(4, 0)).toBe("short");
    expect(nextBreakKind(-1, 4)).toBe("short");
  });
});

describe("remainingSeconds", () => {
  it("counts down", () => {
    expect(remainingSeconds(1500, 0)).toBe(1500);
    expect(remainingSeconds(1500, 60)).toBe(1440);
  });

  it("clamps at zero rather than going negative", () => {
    // A phase that overran reads 00:00, never -00:03.
    expect(remainingSeconds(1500, 1503)).toBe(0);
  });

  it("rounds up, so the last partial second still shows as 1", () => {
    expect(remainingSeconds(1500, 1499.2)).toBe(1);
  });
});

describe("cyclePosition", () => {
  it("is one-based and wraps at the interval", () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => cyclePosition(n, 4))).toEqual([1, 2, 3, 4, 1, 2]);
  });

  it("survives a nonsense interval", () => {
    expect(cyclePosition(3, 0)).toBe(1);
  });
});
