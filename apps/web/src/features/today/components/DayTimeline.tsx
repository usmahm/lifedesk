"use client";

import type { CalendarDay, TaskWithMeta } from "@lifedesk/contracts";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";

import { useRunningSession } from "@/features/timer/hooks/useRunningSession";
import { DayGrid, tasksToGridItems } from "@/features/schedule";
import { orpc } from "@/lib/orpc/client";

/**
 * The day's blocked work, on a time axis.
 *
 * Shows *plans*, not tracked time — a task appears only once it has been
 * blocked into a range. Sessions live on the Sessions page; overlaying the two
 * is deliberately deferred.
 */
export function DayTimeline({
  day,
  tasks,
  timezone,
  isPending,
  onOpenTask,
  onSelectSlot,
}: {
  day: CalendarDay | undefined;
  tasks: TaskWithMeta[] | undefined;
  timezone: string | undefined;
  isPending: boolean;
  onOpenTask?: (task: TaskWithMeta) => void;
  onSelectSlot?: (day: CalendarDay, startMin: number, endMin: number) => void;
}) {
  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: true } }));
  const running = useRunningSession();

  if (isPending || !day) return <Skeleton className="h-[520px]" />;

  const items = tasksToGridItems(tasks ?? [], areas.data, running.data?.session?.taskId);
  const blockedCount = items.length;
  const unblockedCount = (tasks ?? []).filter(
    (task) => task.plannedStartMin === null && task.status !== "done",
  ).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {blockedCount === 0
          ? "Nothing blocked yet."
          : `${blockedCount} blocked${unblockedCount > 0 ? ` · ${unblockedCount} without a time` : ""}`}
      </p>

      <DayGrid
        days={[{ day, items }]}
        timezone={timezone}
        today={day}
        onSelectItem={(item) => {
          const task = tasks?.find((candidate) => candidate.id === item.id);
          if (task) onOpenTask?.(task);
        }}
        onSelectSlot={onSelectSlot}
      />
    </div>
  );
}
