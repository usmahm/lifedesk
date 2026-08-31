"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { EmptyState } from "@lifedesk/ui/components/domain/empty-state";
import type { ReactNode } from "react";

import { ErrorState } from "@/components/ErrorState";

import { TaskListSkeleton } from "./TaskListSkeleton";
import { TaskRow } from "./TaskRow";

/**
 * All four list states in one place: loading, error, empty, loaded.
 *
 * Writing them together is deliberate — an empty state added later is an empty
 * state nobody designed. See .claude/rules/ui-components.md.
 */
export function TaskList({
  tasks,
  isPending,
  isError,
  error,
  onRetry,
  emptyTitle,
  emptyAction,
  onOpenTask,
}: {
  tasks: TaskWithMeta[] | undefined;
  isPending: boolean;
  isError: boolean;
  error?: { message: string } | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyAction?: ReactNode;
  onOpenTask?: (task: TaskWithMeta) => void;
}) {
  if (isPending) return <TaskListSkeleton />;

  if (isError) {
    return (
      <ErrorState title="Couldn't load your tasks." detail={error?.message} onRetry={onRetry} />
    );
  }

  if (!tasks || tasks.length === 0) {
    return <EmptyState title={emptyTitle} action={emptyAction} />;
  }

  // Open work first, completed sinks to the bottom — a done task shouldn't
  // hold a position in the list you're working down.
  const sorted = [...tasks].sort(
    (a, b) => Number(a.status === "done") - Number(b.status === "done"),
  );

  return (
    <ul className="-mx-2">
      {sorted.map((task) => (
        <li key={task.id}>
          <TaskRow task={task} onOpen={onOpenTask} />
        </li>
      ))}
    </ul>
  );
}
