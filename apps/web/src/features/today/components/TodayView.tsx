"use client";

import type { CalendarDay, TaskWithMeta } from "@lifedesk/contracts";
import { formatDay } from "@lifedesk/core/time";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@lifedesk/ui/components/tabs";
import { useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { useToday } from "@/features/settings/hooks/useToday";
import { QuickAdd } from "@/features/tasks/components/QuickAdd";
import { TaskDetailSheet } from "@/features/tasks/components/TaskDetailSheet";
import { TaskList } from "@/features/tasks/components/TaskList";
import { TaskListSkeleton } from "@/features/tasks/components/TaskListSkeleton";
import { useTasksForDay } from "@/features/tasks/hooks/useTasks";
import { useCreateTask } from "@/features/tasks/hooks/useTaskMutations";

import { CapacityMeter } from "./CapacityMeter";
import { IntentionLine } from "./IntentionLine";
import { DayTimeline } from "./DayTimeline";

/**
 * Today.
 *
 * The task list stays primary — it is where the day is committed to, and where
 * work with no time on it still lives. The timeline sits beside it on desktop
 * and behind a tab on mobile, so converting the page to a grid never strands
 * an unblocked task.
 */
export function TodayView() {
  const today = useToday();
  const day = today.data?.day;
  const tasks = useTasksForDay(day);
  const createTask = useCreateTask();
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

  /** Clicking an empty stretch of grid creates a task already blocked there. */
  function handleSelectSlot(
    slotDay: CalendarDay,
    plannedStartMin: number,
    plannedEndMin: number,
  ): void {
    createTask.mutate({
      title: "New block",
      scheduledFor: slotDay,
      plannedStartMin,
      plannedEndMin,
    });
  }

  const taskList = (
    <TaskList
      tasks={tasks.data?.items}
      isPending={tasks.isPending}
      isError={tasks.isError}
      error={tasks.error}
      onRetry={() => void tasks.refetch()}
      emptyTitle="Nothing scheduled for today."
      onOpenTask={setOpenTask}
    />
  );

  const timeline = (
    <DayTimeline
      day={day}
      tasks={tasks.data?.items}
      timezone={today.data?.timezone}
      isPending={today.isPending || tasks.isPending}
      onOpenTask={setOpenTask}
      onSelectSlot={handleSelectSlot}
    />
  );

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        {today.isPending ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          // The serif appears here and on the intention line only.
          <h1 className="font-serif text-3xl leading-tight md:text-4xl">{formatDay(day!)}</h1>
        )}

        <IntentionLine day={day} />

        <CapacityMeter day={day} tasks={tasks.data?.items} />
      </header>

      <QuickAdd scheduledFor={day} placeholder="Add something for today" />

      {/* Mobile: tabs, because two columns on a phone is neither. */}
      <div className="lg:hidden">
        <Tabs defaultValue="tasks">
          <TabsList className="w-full">
            <TabsTrigger value="tasks" className="flex-1">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">
              Timeline
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="mt-4">
            {today.isPending ? <TaskListSkeleton /> : taskList}
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            {timeline}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: side by side, list weighted heavier. */}
      <div className="hidden gap-8 lg:grid lg:grid-cols-[1fr_260px]">
        <div>{today.isPending ? <TaskListSkeleton /> : taskList}</div>
        <div>{timeline}</div>
      </div>

      <TaskDetailSheet task={selected} onOpenChange={(open) => !open && setOpenTask(null)} />
    </div>
  );
}
