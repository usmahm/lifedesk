"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { formatMinuteOfDay, parseMinuteOfDay } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { Input } from "@lifedesk/ui/components/input";
import { Label } from "@lifedesk/ui/components/label";
import { X } from "lucide-react";
import { useState } from "react";

import { useSetTaskPlannedTime } from "../hooks/useTaskMutations";
import { If } from "@/components/If";

/**
 * Blocking a task into a time range.
 *
 * This is the keyboard-accessible path to a block — clicking an empty slot on
 * the grid is a mouse convenience on top, not the only way in.
 *
 * Only meaningful once the task has a day; without one there is nowhere to
 * draw the block, and the server refuses it.
 */
export function PlannedTimeFields({ task }: { task: TaskWithMeta }) {
  const setPlannedTime = useSetTaskPlannedTime();

  const [start, setStart] = useState(
    task.plannedStartMin === null ? "" : formatMinuteOfDay(task.plannedStartMin),
  );
  const [end, setEnd] = useState(
    task.plannedEndMin === null ? "" : formatMinuteOfDay(task.plannedEndMin),
  );
  const [error, setError] = useState<string | null>(null);

  const hasDay = task.scheduledFor !== null;
  const isBlocked = task.plannedStartMin !== null;

  function commit(nextStart: string, nextEnd: string): void {
    if (nextStart === "" && nextEnd === "") {
      setError(null);
      if (isBlocked)
        setPlannedTime.mutate({ id: task.id, plannedStartMin: null, plannedEndMin: null });
      return;
    }

    const startMin = parseMinuteOfDay(nextStart);
    const endMin = parseMinuteOfDay(nextEnd);

    // Half-typed input is normal; say nothing until both sides are real.
    if (startMin === null || endMin === null) {
      setError(nextStart && nextEnd ? "Use HH:MM, like 09:00" : null);
      return;
    }

    if (endMin <= startMin) {
      setError("End must be after start");
      return;
    }

    setError(null);
    if (startMin === task.plannedStartMin && endMin === task.plannedEndMin) return;

    setPlannedTime.mutate({ id: task.id, plannedStartMin: startMin, plannedEndMin: endMin });
  }

  function clear(): void {
    setStart("");
    setEnd("");
    setError(null);
    setPlannedTime.mutate({ id: task.id, plannedStartMin: null, plannedEndMin: null });
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
            onClick={clear}
          >
            <X className="size-3" />
            Clear
          </Button>
        </If>
      </div>

      <div className="flex items-center gap-2">
        <Input
          id="task-planned-start"
          value={start}
          disabled={!hasDay}
          placeholder="09:00"
          inputMode="numeric"
          aria-label="Planned start time"
          onChange={(event) => setStart(event.target.value)}
          onBlur={() => commit(start, end)}
          className="tabular-nums"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          value={end}
          disabled={!hasDay}
          placeholder="12:00"
          inputMode="numeric"
          aria-label="Planned end time"
          onChange={(event) => setEnd(event.target.value)}
          onBlur={() => commit(start, end)}
          className="tabular-nums"
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
