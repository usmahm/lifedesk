"use client";

import { formatDuration, formatElapsed } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Square } from "lucide-react";
import { createPortal } from "react-dom";

import { orpc } from "@/lib/orpc/client";

import { requestNotificationPermission } from "../lib/notify";
import { usePictureInPicture } from "../hooks/usePictureInPicture";
import { usePomodoro } from "../hooks/usePomodoro";
import { useCountdownTitle } from "../hooks/useCountdownTitle";
import { useElapsedSeconds, useRunningSession } from "../hooks/useRunningSession";
import { useTimerMode } from "../hooks/useTimerMode";
import { useStopTimer } from "../hooks/useTimerControls";
import { PipTimer } from "./PipTimer";
import { PomodoroControls } from "./PomodoroControls";
import { TimerModeToggle } from "./TimerModeToggle";

/**
 * The persistent timer bar.
 *
 * Docked to the bottom on every screen. Turns --focus green while work is
 * running, which is the one and only thing that colour is allowed to mean —
 * that reservation is why peripheral vision can tell you the clock is going.
 * A Pomodoro *break* is deliberately not green: it is not work.
 *
 * On mobile it sits directly above the tab bar.
 */
export function TimerBar({ className }: { className?: string }) {
  const [mode, setMode] = useTimerMode();
  const running = useRunningSession();
  const stop = useStopTimer();
  const pomodoro = usePomodoro();
  const pip = usePictureInPicture();

  const total = useQuery(orpc.session.totalForToday.queryOptions());

  const session = running.data?.session ?? null;
  const elapsed = useElapsedSeconds(session?.startedAt ?? null, running.data?.serverNow ?? null);

  const task = useQuery({
    ...orpc.task.get.queryOptions({ input: { id: session?.taskId ?? "" } }),
    enabled: Boolean(session?.taskId),
  });

  const taskTitle = task.data?.title ?? "Untitled session";
  const isPomodoro = mode === "pomodoro";
  const phaseLabel = describePhase(pomodoro.phase, pomodoro.position, pomodoro.longBreakEvery);

  // The universal fallback: a tab strip is visible far more often than a
  // floating window, and it is all Safari and iOS ever get.
  useCountdownTitle(
    isPomodoro && (pomodoro.phase === "work" || pomodoro.phase === "break")
      ? `${formatElapsed(pomodoro.remaining)} · ${taskTitle}`
      : session
        ? `${formatElapsed(elapsed)} · ${taskTitle}`
        : null,
  );

  if (running.isPending) {
    return (
      <div className={cn("border-t border-border bg-background px-4 py-3 md:px-6", className)}>
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  const isRunning = session !== null;
  const todayTotal = (total.data?.totalSec ?? 0) + (isRunning ? elapsed : 0);
  const isWorking = isPomodoro ? pomodoro.phase === "work" : isRunning;

  return (
    <div
      className={cn(
        "border-t border-border transition-colors duration-150",
        isWorking ? "bg-focus/8" : "bg-background",
        className,
      )}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-[720px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 md:px-6">
        {isPomodoro ? (
          <PomodoroControls
            phase={pomodoro.phase}
            label={phaseLabel}
            taskTitle={taskTitle}
            seconds={pomodoro.remaining}
            breakKind={pomodoro.breakKind}
            canResume={pomodoro.canResume}
            isPipSupported={pip.isSupported}
            isPipOpen={pip.isOpen}
            onStop={() => session && stop.mutate({ id: session.id })}
            onStartBreak={pomodoro.startBreak}
            onSkipBreak={pomodoro.skipBreak}
            onStartWork={pomodoro.startWork}
            onTogglePip={() => (pip.isOpen ? pip.close() : void pip.open())}
          />
        ) : isRunning ? (
          <>
            <span
              aria-hidden
              className="size-2 shrink-0 animate-pulse rounded-full bg-focus motion-reduce:animate-none"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{taskTitle}</p>
              <p className="sr-only text-xs text-muted-foreground md:not-sr-only">
                Session running
              </p>
            </div>

            {/* The elapsed value itself is not announced — it would speak every second. */}
            <span
              className="text-xl font-medium text-focus tabular-nums"
              aria-label={`Elapsed ${formatDuration(elapsed)}`}
            >
              {formatElapsed(elapsed)}
            </span>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => stop.mutate({ id: session.id })}
              disabled={stop.isPending}
            >
              <Square className="size-3.5 fill-current" />
              Stop
            </Button>
          </>
        ) : (
          <>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-muted-foreground/30" />
            <p className="flex-1 text-sm text-muted-foreground">No session running</p>
          </>
        )}

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          {/* Switching mid-phase would leave a session running under rules it
              was not started with. */}
          <TimerModeToggle
            mode={mode}
            onChange={(next) => {
              setMode(next);
              // The gesture that justifies the prompt. Asking on page load is
              // the fastest way to be denied permanently.
              if (next === "pomodoro") void requestNotificationPermission();
            }}
            disabled={isRunning || pomodoro.phase === "break"}
          />

          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDuration(todayTotal)} today
          </span>
        </div>
      </div>

      {/* `&&`, not `<If>`: the condition is doing the narrowing that makes
          `.document` safe, and `<If>` cannot narrow across a component
          boundary. See .claude/rules/ui-components.md. */}
      {pip.pipWindow &&
        createPortal(
          <PipTimer
            phase={pomodoro.phase}
            label={phaseLabel}
            taskTitle={taskTitle}
            seconds={pomodoro.remaining}
            onStop={() => session && stop.mutate({ id: session.id })}
          />,
          pip.pipWindow.document.body,
        )}
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
      return "Pomodoro · hit play on a task";
  }
}
