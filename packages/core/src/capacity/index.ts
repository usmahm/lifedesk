import type { TaskStatus } from "@lifedesk/contracts";

/**
 * Capacity is a soft signal, not a gate.
 *
 * The point is that you notice you've planned nine hours *before* the day
 * rather than after it. It informs; it never blocks.
 */

/** Above this the meter shifts amber. */
export const CAPACITY_WARN_RATIO = 1;

const OPEN_STATUSES: readonly TaskStatus[] = ["todo", "doing"];

export type CapacityInput = {
  estimateMin: number | null;
  status: TaskStatus;
};

export type CapacitySummary = {
  /** Sum of estimates on open tasks. */
  plannedMin: number;
  capacityMin: number;
  /** Planned ÷ capacity. `0` when capacity is somehow zero. */
  ratio: number;
  isOver: boolean;
  /** Never negative — over-capacity is expressed by `isOver`, not a negative. */
  remainingMin: number;
  /** Open tasks with no estimate. The meter under-reports by this much. */
  unestimatedCount: number;
  openCount: number;
};

function isOpen(task: CapacityInput): boolean {
  return OPEN_STATUSES.includes(task.status);
}

export function summarizeCapacity(
  tasks: readonly CapacityInput[],
  capacityMin: number,
): CapacitySummary {
  const open = tasks.filter(isOpen);

  const plannedMin = open.reduce((sum, task) => sum + (task.estimateMin ?? 0), 0);
  const unestimatedCount = open.filter((task) => task.estimateMin === null).length;
  const ratio = capacityMin > 0 ? plannedMin / capacityMin : 0;

  return {
    plannedMin,
    capacityMin,
    ratio,
    isOver: ratio > CAPACITY_WARN_RATIO,
    remainingMin: Math.max(0, capacityMin - plannedMin),
    unestimatedCount,
    openCount: open.length,
  };
}

/**
 * How optimistic the estimates were: actual ÷ estimated.
 *
 * `1` is calibrated, `2.4` means things take nearly two and a half times as
 * long as expected. Null when there isn't enough data to say anything honest.
 */
export function estimateAccuracy(
  samples: readonly { estimateMin: number | null; trackedSec: number }[],
): number | null {
  const usable = samples.filter(
    (s): s is { estimateMin: number; trackedSec: number } =>
      s.estimateMin !== null && s.estimateMin > 0 && s.trackedSec > 0,
  );

  if (usable.length === 0) return null;

  const estimatedMin = usable.reduce((sum, s) => sum + s.estimateMin, 0);
  const actualMin = usable.reduce((sum, s) => sum + s.trackedSec / 60, 0);

  return actualMin / estimatedMin;
}
