"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { formatDuration, formatDurationMinutes } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { Checkbox } from "@lifedesk/ui/components/checkbox";
import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { cn } from "@lifedesk/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";

import { If } from "@/components/If";
import { useRunningSession } from "@/features/timer/hooks/useRunningSession";
import { useTimerMode } from "@/features/timer/hooks/useTimerMode";
import { useStartTimer } from "@/features/timer/hooks/useTimerControls";
import { orpc } from "@/lib/orpc/client";

import { useSetTaskComplete } from "../hooks/useTaskMutations";

/**
 * A task in a list. 48px tall, which also clears the 44px tap target.
 *
 * The play button is revealed on hover on desktop but is ALWAYS visible on
 * touch — hover-only is invisible on a phone.
 * See .claude/rules/ui-components.md.
 */
export function TaskRow({
  task,
  onOpen,
}: {
  task: TaskWithMeta;
  onOpen?: (task: TaskWithMeta) => void;
}) {
  const setComplete = useSetTaskComplete();
  const startTimer = useStartTimer();
  const [mode] = useTimerMode();
  const running = useRunningSession();

  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: true } }));
  const projects = useQuery(orpc.project.list.queryOptions({ input: { includeArchived: true } }));

  const area = areas.data?.find((a) => a.id === task.areaId);
  const project = projects.data?.find((p) => p.id === task.projectId);

  const isDone = task.status === "done";
  const isRunning = running.data?.session?.taskId === task.id;

  return (
    <div
      className={cn(
        "group relative flex h-12 items-center gap-3 rounded-md px-2 transition-colors duration-150 hover:bg-accent/40",
        isDone && "opacity-60",
      )}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={(checked) =>
          setComplete.mutate({ id: task.id, complete: checked === true })
        }
        aria-label={isDone ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`}
      />

      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="min-w-0 flex-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className={cn("block truncate text-sm", isDone && "line-through")}>{task.title}</span>

        {(area || project) && (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {area && <AreaDot color={area.color} />}
            <span className="truncate">
              {area?.name}
              {area && project && " · "}
              {project?.name}
            </span>
          </span>
        )}
      </button>

      <If condition={task.trackedSec > 0}>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatDuration(task.trackedSec)}
        </span>
      </If>

      {task.estimateMin !== null && (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatDurationMinutes(task.estimateMin)}
        </span>
      )}

      <If condition={!isDone}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 shrink-0",
            // Always reachable on touch; revealed on hover with a pointer.
            "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
            isRunning && "text-focus md:opacity-100",
          )}
          disabled={startTimer.isPending || isRunning}
          // Starts whichever clock the timer bar is set to. The row keeps one
          // ▶ rather than gaining a second control — the mode is chosen once,
          // in the bar, not per task.
          onClick={() => startTimer.mutate({ taskId: task.id, source: mode })}
          aria-label={isRunning ? "Session running" : `Start timer for "${task.title}"`}
        >
          <Play className={cn("size-3.5", isRunning && "fill-current")} />
        </Button>
      </If>
    </div>
  );
}
