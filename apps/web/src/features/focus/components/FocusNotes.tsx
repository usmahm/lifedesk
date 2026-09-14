"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { Textarea } from "@lifedesk/ui/components/textarea";
import { useState } from "react";

import { useUpdateTask } from "@/features/tasks/hooks/useTaskMutations";

/**
 * The task's notes, editable without leaving Focus.
 *
 * Where you jot as you work, so it is the one panel that has to be in reach
 * rather than a click away.
 *
 * Keyed by task id at the call site, which re-seeds the draft when the focused
 * task changes — React 19's rules here forbid syncing state from an effect.
 */
export function FocusNotes({ task }: { task: TaskWithMeta }) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const update = useUpdateTask();

  return (
    <Textarea
      value={notes}
      onChange={(event) => setNotes(event.target.value)}
      onBlur={() => notes !== (task.notes ?? "") && update.mutate({ id: task.id, notes })}
      placeholder="Notes…"
      rows={6}
      aria-label="Task notes"
      className="resize-none border-transparent bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
    />
  );
}
