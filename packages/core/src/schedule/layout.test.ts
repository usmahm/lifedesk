import { describe, expect, it } from "vitest";

import { coveredMinutes, layoutBlocks, type ScheduleItem } from "./layout";

const at = (id: string, startMin: number, endMin: number): ScheduleItem => ({
  id,
  startMin,
  endMin,
});

/** Compact assertion helper: id → "lane/laneCount". */
function lanes(items: readonly ScheduleItem[]): Record<string, string> {
  return Object.fromEntries(
    layoutBlocks(items).map((item) => [item.id, `${item.lane}/${item.laneCount}`]),
  );
}

describe("layoutBlocks", () => {
  it("gives disjoint blocks the full width", () => {
    expect(lanes([at("a", 540, 600), at("b", 660, 720)])).toEqual({
      a: "0/1",
      b: "0/1",
    });
  });

  it("splits two identical blocks into two lanes", () => {
    expect(lanes([at("a", 540, 720), at("b", 540, 720)])).toEqual({
      a: "0/2",
      b: "1/2",
    });
  });

  it("treats touching blocks as consecutive, not concurrent", () => {
    // 09:00–10:00 and 10:00–11:00 are back to back. Forcing them into
    // separate lanes would halve both widths for no reason.
    expect(lanes([at("a", 540, 600), at("b", 600, 660)])).toEqual({
      a: "0/1",
      b: "0/1",
    });
  });

  it("stacks short blocks beside a long one", () => {
    // A spans the whole morning; B and C are consecutive inside it, so they
    // can share the second lane.
    expect(lanes([at("long", 540, 720), at("b", 540, 600), at("c", 600, 660)])).toEqual({
      long: "0/2",
      b: "1/2",
      c: "1/2",
    });
  });

  it("puts the longer block in the leftmost lane when starts tie", () => {
    const positioned = layoutBlocks([at("short", 540, 570), at("long", 540, 720)]);
    expect(positioned.find((p) => p.id === "long")?.lane).toBe(0);
    expect(positioned.find((p) => p.id === "short")?.lane).toBe(1);
  });

  it("handles three-deep overlap", () => {
    expect(lanes([at("a", 540, 720), at("b", 560, 700), at("c", 580, 680)])).toEqual({
      a: "0/3",
      b: "1/3",
      c: "2/3",
    });
  });

  it("keeps transitively-overlapping blocks in one cluster", () => {
    // A–B overlap and B–C overlap, but A and C are disjoint. All three must
    // share a laneCount so the columns line up down the cluster.
    const result = lanes([at("a", 540, 600), at("b", 570, 660), at("c", 630, 690)]);
    expect(result.a).toBe("0/2");
    expect(result.b).toBe("1/2");
    expect(result.c).toBe("0/2");
  });

  it("starts a fresh cluster after a gap, so widths recover", () => {
    const result = lanes([
      at("a", 540, 720),
      at("b", 540, 720),
      // well clear of the pair above
      at("later", 900, 960),
    ]);
    expect(result.a).toBe("0/2");
    expect(result.b).toBe("1/2");
    expect(result.later).toBe("0/1");
  });

  it("is independent of input order", () => {
    const items = [at("a", 540, 720), at("b", 560, 700), at("c", 900, 960)];
    expect(lanes(items)).toEqual(lanes([...items].reverse()));
  });

  it("sorts output by start time", () => {
    const positioned = layoutBlocks([at("c", 900, 960), at("a", 540, 600), at("b", 660, 720)]);
    expect(positioned.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("drops blocks with no duration rather than rendering a sliver", () => {
    expect(layoutBlocks([at("zero", 540, 540), at("backwards", 700, 600)])).toEqual([]);
  });

  it("returns nothing for an empty day", () => {
    expect(layoutBlocks([])).toEqual([]);
  });

  it("preserves extra fields on the item", () => {
    const [first] = layoutBlocks([{ ...at("a", 540, 600), title: "Rerun ablations" }]);
    expect(first).toMatchObject({ id: "a", title: "Rerun ablations", lane: 0, laneCount: 1 });
  });
});

describe("coveredMinutes", () => {
  it("adds up disjoint blocks", () => {
    expect(coveredMinutes([at("a", 540, 600), at("b", 660, 720)])).toBe(120);
  });

  it("counts an overlap once", () => {
    // 09:00–11:00 and 10:00–12:00 cover three hours of wall clock, not four.
    expect(coveredMinutes([at("a", 540, 660), at("b", 600, 720)])).toBe(180);
  });

  it("counts a fully nested block once", () => {
    expect(coveredMinutes([at("a", 540, 720), at("b", 570, 600)])).toBe(180);
  });

  it("is zero for an empty day", () => {
    expect(coveredMinutes([])).toBe(0);
  });
});
