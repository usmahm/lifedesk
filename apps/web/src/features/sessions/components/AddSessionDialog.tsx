"use client";

import type { CalendarDay, TaskWithMeta } from "@lifedesk/contracts";
import { addDays, formatDuration, instantAt, toClockTime } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lifedesk/ui/components/dialog";
import { Label } from "@lifedesk/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lifedesk/ui/components/select";
import { Textarea } from "@lifedesk/ui/components/textarea";
import { useState } from "react";

import { TimeField } from "@/components/fields/TimeField";
import { If } from "@/components/If";
import { DayPicker } from "@/features/tasks/components/DayPicker";

import { DEFAULT_MANUAL_SESSION_MINUTES, NO_TASK } from "../constants";
import { useCreateSession } from "../hooks/useSessionMutations";

/**
 * Logging time you forgot to track.
 *
 * The runaway banner can already correct a timer left running, but until now
 * there was no way to record work that was never started — which is the more
 * common failure. Two hours offline with no clock running was simply lost.
 *
 * Entry is a day plus two times rather than two timestamps, because that is
 * how the work is remembered. An end at or before the start rolls onto the
 * next day, so a session from 23:30 to 00:30 needs no second date field and
 * no explanation — unlike a planned block, a session crossing midnight is
 * normal rather than an edge case.
 */
export function AddSessionDialog({
  open,
  onOpenChange,
  day,
  timezone,
  nowMinute,
  tasks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The day being viewed — what a new entry defaults to. */
  day: CalendarDay;
  timezone: string;
  nowMinute: number;
  tasks: TaskWithMeta[];
}) {
  const create = useCreateSession();

  const [entryDay, setEntryDay] = useState<CalendarDay>(day);
  const [startMin, setStartMin] = useState(Math.max(0, nowMinute - DEFAULT_MANUAL_SESSION_MINUTES));
  const [endMin, setEndMin] = useState(nowMinute);
  const [taskId, setTaskId] = useState<string>(NO_TASK);
  const [note, setNote] = useState("");

  const crossesMidnight = endMin < startMin;
  const isZeroLength = endMin === startMin;
  const durationSec = ((crossesMidnight ? endMin + 1440 : endMin) - startMin) * 60;

  function handleSubmit() {
    const startedAt = instantAt(entryDay, toClockTime(startMin), timezone);
    const endedAt = instantAt(
      crossesMidnight ? addDays(entryDay, 1) : entryDay,
      toClockTime(endMin),
      timezone,
    );

    create.mutate(
      {
        taskId: taskId === NO_TASK ? null : taskId,
        startedAt,
        endedAt,
        note: note.trim() || null,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a session</DialogTitle>
          <DialogDescription>Time you worked but never started the clock for.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-task">Task</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger id="session-task" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TASK}>No task</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Day</Label>
            <div>
              <DayPicker
                value={entryDay}
                today={day}
                onChange={(next) => next && setEntryDay(next)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-start">Time</Label>
            <div className="flex items-center gap-2">
              <TimeField id="session-start" value={startMin} onChange={setStartMin} />
              <span className="text-sm text-muted-foreground">to</span>
              <TimeField value={endMin} onChange={setEndMin} />
            </div>

            <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {isZeroLength ? (
                <span className="text-destructive">Start and end can&rsquo;t be the same.</span>
              ) : (
                <>
                  {formatDuration(durationSec)}
                  <If condition={crossesMidnight}> · ends the next day</If>
                </>
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-note">Note</Label>
            <Textarea
              id="session-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isZeroLength || create.isPending}>
            Add session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
