"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { Button } from "@lifedesk/ui/components/button";
import { useState } from "react";

import { useToday } from "@/features/settings/hooks/useToday";
import { QuickAdd } from "@/features/tasks/components/QuickAdd";
import { TaskDetailSheet } from "@/features/tasks/components/TaskDetailSheet";
import { TaskList } from "@/features/tasks/components/TaskList";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { useScheduleTask } from "@/features/tasks/hooks/useTaskMutations";

/**
 * The inbox: captured but not yet committed to a day.
 *
 * The separation is the point — a task you've captured is not a task you've
 * promised yourself you'll do today.
 */
export function InboxView() {
  const today = useToday();
  const tasks = useTasks({ unscheduled: true, status: ["todo", "doing"] });
  const schedule = useScheduleTask();
  const [openTask, setOpenTask] = useState<TaskWithMeta | null>(null);

  const selected = openTask
    ? (tasks.data?.items.find((t) => t.id === openTask.id) ?? openTask)
    : null;

  const count = tasks.data?.items.length ?? 0;

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">Inbox</h1>
        {count > 0 && (
          <span className="text-muted-foreground text-sm tabular-nums">
            {count} waiting
          </span>
        )}
      </header>

      <QuickAdd placeholder="Capture something" />

      <TaskList
        tasks={tasks.data?.items}
        isPending={tasks.isPending}
        isError={tasks.isError}
        error={tasks.error}
        onRetry={() => void tasks.refetch()}
        emptyTitle="Inbox is clear."
        onOpenTask={setOpenTask}
      />

      {count > 0 && today.data && (
        <Button
          variant="secondary"
          size="sm"
          disabled={schedule.isPending}
          onClick={() => {
            // Pull the whole inbox into today in one go — the deliberate-pull
            // model still wants a fast path for a short list.
            for (const task of tasks.data?.items ?? []) {
              schedule.mutate({ id: task.id, scheduledFor: today.data.day });
            }
          }}
        >
          Pull everything into today
        </Button>
      )}

      <TaskDetailSheet task={selected} onOpenChange={(open) => !open && setOpenTask(null)} />
    </div>
  );
}
