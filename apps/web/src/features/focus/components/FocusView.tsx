"use client";

import type { CalendarDay } from "@lifedesk/contracts";
import { formatDuration, formatElapsed } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Check, Coffee, Play, Square, X } from "lucide-react";
import { useEffect } from "react";

import { If } from "@/components/If";
import { useSetTaskComplete } from "@/features/tasks/hooks/useTaskMutations";
import { usePomodoro } from "@/features/timer/hooks/usePomodoro";
import { useElapsedSeconds, useRunningSession } from "@/features/timer/hooks/useRunningSession";
import { useStopTimer } from "@/features/timer/hooks/useTimerControls";
import { orpc } from "@/lib/orpc/client";

import { FOCUS_COLUMN } from "../constants";
import { useExitFocus } from "../hooks/useExitFocus";
import { FocusNotes } from "./FocusNotes";
import { FocusSessions } from "./FocusSessions";

/**
 * One screen for the thing in progress, and nothing else.
 *
 * Anchored to the running session rather than a task you pick, so Focus and
 * "what am I actually doing" cannot disagree. The rail, tab bar and timer bar
 * are absent rather than hidden — this route lives outside `AppShell`.
 */
export function FocusView() {
  const exit = useExitFocus();
  const running = useRunningSession();
  const pomodoro = usePomodoro();
  const stop = useStopTimer();
  const complete = useSetTaskComplete();

  const today = useQuery(orpc.settings.today.queryOptions());
  const session = running.data?.session ?? null;
  const elapsed = useElapsedSeconds(session?.startedAt ?? null, running.data?.serverNow ?? null);

  const task = useQuery({
    ...orpc.task.get.queryOptions({ input: { id: session?.taskId ?? "" } }),
    enabled: Boolean(session?.taskId),
  });

  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: true } }));
  const projects = useQuery(orpc.project.list.queryOptions({ input: { includeArchived: true } }));

  const onBreak = pomodoro.phase === "break" || pomodoro.phase === "work-ended";

  /**
   * Leave when there is nothing to focus on.
   *
   * One rule covering both cases: the session just ended, or there never was
   * one. Two guards matter. `isPending` keeps a direct load from bouncing
   * straight back out before the query has answered — and `onBreak` holds
   * through a Pomodoro break, which has no session by design but is still the
   * same bout of work. Without it Focus would eject you to Today every
   * twenty-five minutes, mid-cycle.
   */
  useEffect(() => {
    if (session || running.isPending || onBreak) return;
    exit();
  }, [exit, onBreak, running.isPending, session]);

  if (running.isPending || (session?.taskId && task.isPending)) {
    return (
      <FocusFrame onExit={exit}>
        <div className="space-y-4">
          <Skeleton className="mx-auto h-9 w-64" />
          <Skeleton className="mx-auto h-14 w-40" />
        </div>
      </FocusFrame>
    );
  }

  const area = areas.data?.find((candidate) => candidate.id === task.data?.areaId);
  const project = projects.data?.find((candidate) => candidate.id === task.data?.projectId);

  const isPomodoro = pomodoro.phase !== "idle";
  const seconds = isPomodoro ? pomodoro.remaining : elapsed;
  const isWorking = isPomodoro ? pomodoro.phase === "work" : session !== null;

  return (
    <FocusFrame onExit={exit}>
      <div className="space-y-8 text-center">
        <header className="space-y-2">
          {/* Sans, not serif: the serif is reserved for the date header and the
              day's intention line, and a third use spends it for nothing. */}
          <h1 className="text-2xl leading-tight font-medium text-balance md:text-3xl">
            {task.data?.title ?? "Untitled session"}
          </h1>

          <If condition={Boolean(area ?? project)}>
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              {area && <AreaDot color={area.color} label={area.name} />}
              {area?.name}
              {area && project && " · "}
              {project?.name}
            </p>
          </If>
        </header>

        <div className="space-y-1">
          <p
            className={cn(
              "text-[40px] leading-none font-medium tabular-nums",
              isWorking ? "text-focus" : "text-foreground",
            )}
            aria-label={`${formatDuration(seconds)} ${isPomodoro ? "remaining" : "elapsed"}`}
          >
            {formatElapsed(seconds)}
          </p>

          <If condition={isPomodoro}>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {describePhase(pomodoro.phase, pomodoro.position, pomodoro.longBreakEvery)}
            </p>
          </If>
        </div>

        <div className="flex items-center justify-center gap-2">
          <If condition={session !== null}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => session && stop.mutate({ id: session.id })}
              disabled={stop.isPending}
            >
              <Square className="size-3.5 fill-current" />
              Stop
            </Button>
          </If>

          <If condition={pomodoro.phase === "work-ended"}>
            <Button size="sm" onClick={pomodoro.startBreak}>
              <Coffee className="size-3.5" />
              {pomodoro.breakKind === "long" ? "Long break" : "Break"}
            </Button>
          </If>

          <If condition={pomodoro.phase === "break-ended" && pomodoro.canResume}>
            <Button size="sm" onClick={pomodoro.startWork}>
              <Play className="size-3.5 fill-current" />
              Start work
            </Button>
          </If>

          <If condition={task.data !== undefined}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => task.data && complete.mutate({ id: task.data.id, complete: true })}
            >
              <Check className="size-3.5" />
              Done
            </Button>
          </If>
        </div>
      </div>

      <If condition={task.data !== undefined}>
        <div className="mt-10 space-y-6 border-t border-border pt-6 text-left">
          {task.data && <FocusNotes key={task.data.id} task={task.data} />}

          <If condition={Boolean(task.data && task.data.trackedSec > 0)}>
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatDuration(task.data?.trackedSec ?? 0)} tracked
              {task.data?.estimateMin != null &&
                ` of ${formatDuration(task.data.estimateMin * 60)} estimated`}
            </p>
          </If>

          {task.data && today.data && (
            <FocusSessions
              taskId={task.data.id}
              day={today.data.day as CalendarDay}
              timezone={today.data.timezone}
            />
          )}
        </div>
      </If>
    </FocusFrame>
  );
}

/** The bare page: one exit affordance, and a lot of room. */
function FocusFrame({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex justify-end p-4">
        <Button variant="ghost" size="sm" onClick={onExit} className="text-muted-foreground">
          <X className="size-4" />
          <span className="max-sm:sr-only">Exit</span>
          <kbd className="ml-1 hidden text-[10px] tracking-wide sm:inline">esc</kbd>
        </Button>
      </div>

      <main className={cn("mx-auto w-full flex-1 px-6 pb-16", FOCUS_COLUMN)}>{children}</main>
    </div>
  );
}

function describePhase(
  phase: ReturnType<typeof usePomodoro>["phase"],
  position: number,
  longBreakEvery: number,
): string {
  switch (phase) {
    case "work":
      return `Work · ${position} of ${longBreakEvery}`;
    case "work-ended":
      return "Phase done — take a break";
    case "break":
      return "Break";
    case "break-ended":
      return "Break over";
    default:
      return "";
  }
}
