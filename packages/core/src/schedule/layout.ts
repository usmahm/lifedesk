/**
 * Laying overlapping blocks out in lanes.
 *
 * Two tasks blocked 09:00–12:00 must sit side by side, not on top of each
 * other. This is the standard calendar packing algorithm, and it is the one
 * piece of this feature that is genuinely easy to get subtly wrong — which is
 * why it lives here, as pure functions with tests, rather than inside a
 * component.
 */

export type ScheduleItem = {
  id: string;
  startMin: number;
  endMin: number;
};

export type PositionedItem<T extends ScheduleItem = ScheduleItem> = T & {
  /** Zero-based column within the overlapping cluster. */
  lane: number;
  /** How many columns the cluster was split into. Width is 1 / laneCount. */
  laneCount: number;
};

/**
 * Blocks that merely touch do not overlap.
 *
 * A block ending at 10:00 and one starting at 10:00 are consecutive, not
 * concurrent, and forcing them into separate lanes would halve both widths
 * for no reason.
 */
function overlaps(aEnd: number, bStart: number): boolean {
  return bStart < aEnd;
}

/**
 * Assign every block a lane, so none is hidden behind another.
 *
 * Blocks are grouped into *clusters* of transitively overlapping items — A
 * overlaps B and B overlaps C puts all three in one cluster even if A and C
 * are disjoint. Every block in a cluster gets the same `laneCount`, which
 * keeps columns aligned down the cluster instead of jumping width partway.
 *
 * Input order does not matter; output is sorted by start time.
 */
export function layoutBlocks<T extends ScheduleItem>(items: readonly T[]): PositionedItem<T>[] {
  const sorted = [...items]
    // A zero- or negative-length block cannot be rendered. The contract
    // forbids them; this is belt and braces.
    .filter((item) => item.endMin > item.startMin)
    .sort(
      (a, b) =>
        a.startMin - b.startMin ||
        // Longer blocks first, so a long one takes the leftmost lane and the
        // short ones stack beside it rather than pushing it around.
        b.endMin - a.endMin ||
        a.id.localeCompare(b.id),
    );

  const positioned: PositionedItem<T>[] = [];

  /** Indices into `positioned` for the cluster being built. */
  let cluster: number[] = [];
  /** End time of the last block in each lane of the current cluster. */
  let laneEnds: number[] = [];
  /** The furthest any block in the cluster reaches. */
  let clusterEnd = -1;

  function closeCluster(): void {
    for (const index of cluster) {
      positioned[index]!.laneCount = laneEnds.length;
    }
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  }

  for (const item of sorted) {
    // Disjoint from everything so far — the previous cluster is final.
    if (!overlaps(clusterEnd, item.startMin)) closeCluster();

    // First lane whose previous block has already finished.
    let lane = laneEnds.findIndex((end) => !overlaps(end, item.startMin));
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }

    cluster.push(positioned.length);
    positioned.push({ ...item, lane, laneCount: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }

  closeCluster();

  return positioned;
}

/** Total minutes covered, counting overlapping stretches once. */
export function coveredMinutes(items: readonly ScheduleItem[]): number {
  const sorted = [...items]
    .filter((item) => item.endMin > item.startMin)
    .sort((a, b) => a.startMin - b.startMin);

  let total = 0;
  let cursor = -1;

  for (const item of sorted) {
    const from = Math.max(item.startMin, cursor);
    if (item.endMin > from) {
      total += item.endMin - from;
      cursor = item.endMin;
    }
  }

  return total;
}
