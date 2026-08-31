import { describe, expect, it } from "vitest";

import {
  clockSkewMs,
  elapsedSeconds,
  formatDuration,
  formatDurationMinutes,
  formatElapsed,
  isRunawaySession,
  skewCorrectedNow,
} from "./duration";

describe("elapsedSeconds", () => {
  it("derives from startedAt rather than accumulating", () => {
    const startedAt = new Date("2026-08-30T09:00:00Z");
    expect(elapsedSeconds(startedAt, new Date("2026-08-30T09:42:17Z"))).toBe(2537);
  });

  it("never goes negative when the clock is behind", () => {
    const startedAt = new Date("2026-08-30T09:00:00Z");
    expect(elapsedSeconds(startedAt, new Date("2026-08-30T08:59:00Z"))).toBe(0);
  });

  it("survives a long sleep — the value is the real gap, not ticks counted", () => {
    const startedAt = new Date("2026-08-30T09:00:00Z");
    // Laptop slept for six hours; an interval-based counter would report ~0.
    expect(elapsedSeconds(startedAt, new Date("2026-08-30T15:00:00Z"))).toBe(21_600);
  });
});

describe("formatDuration", () => {
  it("renders hours and minutes without decimals", () => {
    expect(formatDuration(8100)).toBe("2h 15m");
    expect(formatDuration(2700)).toBe("45m");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(0)).toBe("0m");
  });

  it("rounds to the nearest minute", () => {
    expect(formatDuration(89)).toBe("1m");
    expect(formatDuration(91)).toBe("2m");
  });

  it("clamps negatives", () => {
    expect(formatDuration(-100)).toBe("0m");
  });

  it("formats minutes directly for estimates", () => {
    expect(formatDurationMinutes(135)).toBe("2h 15m");
    expect(formatDurationMinutes(45)).toBe("45m");
  });
});

describe("formatElapsed", () => {
  it("pads to a stable-width clock face", () => {
    expect(formatElapsed(2537)).toBe("00:42:17");
    expect(formatElapsed(0)).toBe("00:00:00");
    expect(formatElapsed(59)).toBe("00:00:59");
    expect(formatElapsed(3600)).toBe("01:00:00");
  });

  it("keeps counting past 24 hours rather than wrapping", () => {
    expect(formatElapsed(90_000)).toBe("25:00:00");
  });
});

describe("isRunawaySession", () => {
  it("flags a session left running overnight", () => {
    const startedAt = new Date("2026-08-30T09:00:00Z");
    expect(isRunawaySession(startedAt, new Date("2026-08-30T16:00:00Z"))).toBe(false);
    expect(isRunawaySession(startedAt, new Date("2026-08-30T23:00:00Z"))).toBe(true);
  });
});

describe("clock skew", () => {
  it("corrects a fast local clock", () => {
    const serverNow = new Date("2026-08-30T09:00:00Z");
    const localNow = new Date("2026-08-30T09:20:00Z"); // 20 minutes fast

    const skew = clockSkewMs(serverNow, localNow);
    expect(skew).toBe(-20 * 60 * 1000);

    const corrected = skewCorrectedNow(new Date("2026-08-30T09:25:00Z"), skew);
    expect(corrected.toISOString()).toBe("2026-08-30T09:05:00.000Z");
  });

  it("keeps elapsed time honest for a user with a wrong clock", () => {
    const startedAt = new Date("2026-08-30T09:00:00Z"); // server truth
    const skew = clockSkewMs(startedAt, new Date("2026-08-30T09:20:00Z"));

    // Five real minutes later, the local clock reads 09:25.
    const elapsed = elapsedSeconds(
      startedAt,
      skewCorrectedNow(new Date("2026-08-30T09:25:00Z"), skew),
    );
    expect(elapsed).toBe(300);
  });
});
