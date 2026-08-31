"use client";

import type { CalendarDay, TaskWithMeta } from "@lifedesk/contracts";
import { formatDay, formatDuration, toCalendarDay } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { Input } from "@lifedesk/ui/components/input";
import { Label } from "@lifedesk/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lifedesk/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@lifedesk/ui/components/sheet";
import { Textarea } from "@lifedesk/ui/components/textarea";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { useToday } from "@/features/settings/hooks/useToday";
import { orpc } from "@/lib/orpc/client";

import { NO_VALUE } from "../constants";
import { useDeleteTask, useUpdateTask } from "../hooks/useTaskMutations";
import { DayPicker } from "./DayPicker";

/**
 * Task detail.
 *
 * A right-hand panel on desktop, a full-height sheet on mobile — one Sheet
 * serves both, sized responsively.
 *
 * Edits save on blur rather than behind a Save button: this is a personal
 * planner, not a form, and a save step you can forget is a save step that
 * loses work.
 */
export function TaskDetailSheet({
  task,
  onOpenChange,
}: {
  task: TaskWithMeta | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!task) return null;

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {/* Keyed by task id so opening a different task remounts the form and
            re-seeds its draft state — no syncing effect required. */}
        <TaskDetailForm key={task.id} task={task} onOpenChange={onOpenChange} />
      </SheetContent>
    </Sheet>
  );
}

function TaskDetailForm({
  task,
  onOpenChange,
}: {
  task: TaskWithMeta;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const today = useToday();

  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: false } }));
  const projects = useQuery(
    orpc.project.list.queryOptions({ input: { includeArchived: false } }),
  );
  const sessions = useQuery({
    ...orpc.session.list.queryOptions({
      input: { filters: { taskId: task?.id }, page: { limit: 20 } },
    }),
    enabled: Boolean(task),
  });

  // Seeded once on mount; the parent's `key` handles switching tasks.
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [estimate, setEstimate] = useState(
    task.estimateMin === null ? "" : String(task.estimateMin),
  );

  const visibleProjects = projects.data?.filter(
    (project) => !task.areaId || project.areaId === task.areaId || project.id === task.projectId,
  );

  return (
    <>
        <SheetHeader className="pb-2">
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => title.trim() && title !== task.title && update.mutate({ id: task.id, title: title.trim() })}
            aria-label="Task title"
            className="h-auto border-0 px-0 text-base font-medium shadow-none focus-visible:ring-0"
          />
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-area">Area</Label>
              <Select
                value={task.areaId ?? NO_VALUE}
                onValueChange={(value) =>
                  update.mutate({
                    id: task.id,
                    areaId: value === NO_VALUE ? null : value,
                    // Clear the project when the area changes — a project in
                    // another area would be an orphan pairing.
                    ...(value !== task.areaId && { projectId: null }),
                  })
                }
              >
                <SelectTrigger id="task-area" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_VALUE}>None</SelectItem>
                  {areas.data?.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      <span className="flex items-center gap-2">
                        <AreaDot color={area.color} />
                        {area.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-project">Project</Label>
              <Select
                value={task.projectId ?? NO_VALUE}
                onValueChange={(value) =>
                  update.mutate({ id: task.id, projectId: value === NO_VALUE ? null : value })
                }
              >
                <SelectTrigger id="task-project" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_VALUE}>None</SelectItem>
                  {visibleProjects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-estimate">Estimate (minutes)</Label>
              <Input
                id="task-estimate"
                type="number"
                inputMode="numeric"
                min={1}
                value={estimate}
                onChange={(event) => setEstimate(event.target.value)}
                onBlur={() => {
                  const parsed = estimate === "" ? null : Number(estimate);
                  if (parsed !== task.estimateMin && (parsed === null || parsed > 0)) {
                    update.mutate({ id: task.id, estimateMin: parsed });
                  }
                }}
                className="tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Scheduled</Label>
              <DayPicker
                value={task.scheduledFor}
                today={today.data?.day}
                onChange={(day: CalendarDay | null) =>
                  update.mutate({ id: task.id, scheduledFor: day })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => notes !== (task.notes ?? "") && update.mutate({ id: task.id, notes })}
              rows={8}
              placeholder="Markdown is fine here."
              className="resize-y font-mono text-[13px] leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <Label>Tracked</Label>
            <p className="text-sm tabular-nums">
              {task.trackedSec > 0 ? formatDuration(task.trackedSec) : "Nothing yet"}
              {task.estimateMin !== null && task.trackedSec > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  of {formatDuration(task.estimateMin * 60)} estimated
                </span>
              )}
            </p>

            {sessions.data && sessions.data.items.length > 0 && (
              <ul className="text-muted-foreground space-y-1 text-xs">
                {sessions.data.items.slice(0, 6).map((session) => (
                  <li key={session.id} className="flex justify-between tabular-nums">
                    {/* The day a session belongs to is resolved in the user's
                        zone, never from the UTC part of the timestamp. */}
                    <span>
                      {formatDay(
                        toCalendarDay(session.startedAt, today.data?.timezone ?? "UTC"),
                        "EEE d MMM",
                      )}
                    </span>
                    <span>
                      {session.durationSec === null
                        ? "running"
                        : formatDuration(session.durationSec)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive gap-2 px-0"
            onClick={() => {
              remove.mutate({ id: task.id });
              onOpenChange(false);
            }}
          >
            <Trash2 className="size-3.5" />
            Delete task
          </Button>
        </div>
    </>
  );
}
