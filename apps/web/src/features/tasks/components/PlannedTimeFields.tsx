"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { Button } from "@lifedesk/ui/components/button";
import { Label } from "@lifedesk/ui/components/label";
import { X } from "lucide-react";
import { useState } from "react";

import { TimeField } from "@/components/fields/TimeField";
import { If } from "@/components/If";

import { DEFAULT_BLOCK_MINUTES, DEFAULT_BLOCK_START_MIN } from "../constants";
import { useSetTaskPlannedTime } from "../hooks/useTaskMutations";

/**
 * Blocking a task into a time range on its scheduled day.
 *
 * The segments make a malformed time unrepresentable, so there is nothing to
 * parse and no "use HH:MM" error to show — that whole class of failure is gone
 * rather than handled. The only check left is a real rule rather than a
 * formatting one: an end must come after its start.
 *
 * Only meaningful once the task has a day; without one there is nowhere to
 * draw the block, and the server refuses it.
 */
export function PlannedTimeFields({ task }: { task: TaskWithMeta }) {
  const setPlannedTime = useSetTaskPlannedTime();
  const [error, setError] = useState<string | null>(null);

  const hasDay = task.scheduledFor !== null;
  const isBlocked = task.plannedStartMin !== null;

  function commit(startMin: number, endMin: number): void {
    if (endMin <= startMin) {
      setError("End must be after start");
      return;
    }

    setError(null);
    setPlannedTime.mutate({ id: task.id, plannedStartMin: startMin, plannedEndMin: endMin });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="task-planned-start">Planned time</Label>
        <If condition={isBlocked}>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-xs text-muted-foreground"
            onClick={() => {
              setError(null);
              setPlannedTime.mutate({ id: task.id, plannedStartMin: null, plannedEndMin: null });
            }}
          >
            <X className="size-3" />
            Clear
          </Button>
        </If>
      </div>

      <div className="flex items-center gap-2">
        <TimeField
          id="task-planned-start"
          value={task.plannedStartMin}
          disabled={!hasDay}
          onChange={(startMin) =>
            // Blocking from nothing assumes an hour — a zero-length block is
            // something the grid cannot draw.
            commit(startMin, task.plannedEndMin ?? startMin + DEFAULT_BLOCK_MINUTES)
          }
        />

        <span className="text-sm text-muted-foreground">to</span>

        <TimeField
          value={task.plannedEndMin}
          disabled={!hasDay}
          onChange={(endMin) => commit(task.plannedStartMin ?? DEFAULT_BLOCK_START_MIN, endMin)}
        />
      </div>

      <If condition={error !== null}>
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      </If>

      <If condition={!hasDay}>
        <p className="text-xs text-muted-foreground">Give it a day first to block time.</p>
      </If>
    </div>
  );
}
