"use client";

import type { CalendarDay, TaskWithMeta } from "@lifedesk/contracts";
import { coveredMinutes } from "@lifedesk/core/schedule";
import { formatDurationMinutes } from "@lifedesk/core/time";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";

import { If } from "@/components/If";
import { useCapacityForDay } from "@/features/tasks/hooks/useTasks";

/**
 * Planned against capacity.
 *
 * The point is that you notice you've planned nine hours BEFORE the day rather
 * than after it. It informs; it never blocks and never nags.
 *
 * The arithmetic is done on the server — one of the design principles is that
 * time is shown, never calculated by the reader.
 */
export function CapacityMeter({
  day,
  tasks,
}: {
  day: CalendarDay | undefined;
  tasks?: TaskWithMeta[];
}) {
  const capacity = useCapacityForDay(day);

  if (capacity.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-1 w-full rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>
    );
  }

  // A failed meter is not worth an error block — the tasks below are the point.
  if (capacity.isError) return null;

  const { plannedMin, capacityMin, ratio, isOver, unestimatedCount } = capacity.data;

  // Wall-clock time actually set aside. Overlapping blocks count once — two
  // things booked into the same hour is still one hour of the day.
  const blockedMin = coveredMinutes(
    (tasks ?? [])
      .filter((task) => task.plannedStartMin !== null && task.plannedEndMin !== null)
      .map((task) => ({
        id: task.id,
        startMin: task.plannedStartMin!,
        endMin: task.plannedEndMin!,
      })),
  );

  return (
    <div className="space-y-1.5">
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={plannedMin}
        aria-valuemin={0}
        aria-valuemax={capacityMin}
        aria-label={`${formatDurationMinutes(plannedMin)} planned of ${formatDurationMinutes(capacityMin)}`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-150",
            isOver ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>

      <p className={cn("text-xs tabular-nums", isOver ? "text-warning" : "text-muted-foreground")}>
        {formatDurationMinutes(plannedMin)} planned of {formatDurationMinutes(capacityMin)}
        {isOver && " · over"}
        <If condition={blockedMin > 0}>
          <span className="text-muted-foreground">
            {" · "}
            {formatDurationMinutes(blockedMin)} blocked
          </span>
        </If>
        <If condition={unestimatedCount > 0}>
          <span className="text-muted-foreground">
            {" · "}
            {unestimatedCount} without an estimate
          </span>
        </If>
      </p>
    </div>
  );
}
