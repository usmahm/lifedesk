"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { formatDay } from "@lifedesk/core/time";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { useToday } from "@/features/settings/hooks/useToday";
import { QuickAdd } from "@/features/tasks/components/QuickAdd";
import { TaskDetailSheet } from "@/features/tasks/components/TaskDetailSheet";
import { TaskList } from "@/features/tasks/components/TaskList";
import { TaskListSkeleton } from "@/features/tasks/components/TaskListSkeleton";
import { useTasksForDay } from "@/features/tasks/hooks/useTasks";

import { CapacityMeter } from "./CapacityMeter";

/**
 * Today.
 *
 * One thing is loudest here: the date and what the day is for. Everything
 * else recedes. See .claude/rules/design-tokens.md.
 */
export function TodayView() {
  const today = useToday();
  const day = today.data?.day;
  const tasks = useTasksForDay(day);
  const [openTask, setOpenTask] = useState<TaskWithMeta | null>(null);

  // Keep the open panel in step with the list, so an edit is reflected
  // immediately rather than showing the snapshot it was opened with.
  const selected = openTask
    ? (tasks.data?.items.find((t) => t.id === openTask.id) ?? openTask)
    : null;

  if (today.isError) {
    return (
      <ErrorState
        title="Couldn't work out what day it is."
        detail={today.error.message}
        onRetry={() => void today.refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        {today.isPending ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          // The serif appears here and on the intention line only.
          <h1 className="font-serif text-3xl leading-tight md:text-4xl">{formatDay(day!)}</h1>
        )}

        <CapacityMeter day={day} />
      </header>

      <QuickAdd scheduledFor={day} placeholder="Add something for today" />

      {today.isPending ? (
        <TaskListSkeleton />
      ) : (
        <TaskList
          tasks={tasks.data?.items}
          isPending={tasks.isPending}
          isError={tasks.isError}
          error={tasks.error}
          onRetry={() => void tasks.refetch()}
          emptyTitle="Nothing scheduled for today."
          onOpenTask={setOpenTask}
        />
      )}

      <TaskDetailSheet task={selected} onOpenChange={(open) => !open && setOpenTask(null)} />
    </div>
  );
}
