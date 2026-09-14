"use client";

import { formatDuration, formatElapsed } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Maximize2, PictureInPicture2, Square } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { If } from "@/components/If";
import { FOCUS_ORIGIN_PARAM, FOCUS_PATH } from "@/features/focus/constants";
import { orpc } from "@/lib/orpc/client";

import { describePhase } from "../lib/describe-phase";
import { requestNotificationPermission } from "../lib/notify";
import { usePip } from "../hooks/usePip";
import { usePomodoro } from "../hooks/usePomodoro";
import { useCountdownTitle } from "../hooks/useCountdownTitle";
import { useElapsedSeconds, useRunningSession } from "../hooks/useRunningSession";
import { useTimerMode } from "../hooks/useTimerMode";
import { useStopTimer } from "../hooks/useTimerControls";
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
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useTimerMode();
  const running = useRunningSession();
  const stop = useStopTimer();
  const pomodoro = usePomodoro();
  const pip = usePip();

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
  // Something is on the clock — a session, or a Pomodoro break between two.
  const isCounting = isRunning || pomodoro.phase === "break";

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
            onStop={() => session && stop.mutate({ id: session.id })}
            onStartBreak={pomodoro.startBreak}
            onSkipBreak={pomodoro.skipBreak}
            onStartWork={pomodoro.startWork}
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

        {/* Only when there is something to focus on. A session with no task
            has no title, notes or estimate — a Focus screen of three empty
            panels is worse than no button. */}
        <If condition={session?.taskId != null}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`${FOCUS_PATH}?${FOCUS_ORIGIN_PARAM}=${pathname}`)}
          >
            <Maximize2 className="size-3.5" />
            <span className="max-sm:sr-only">Focus</span>
          </Button>
        </If>

        {/* One button for both modes — a plain timer is just as worth floating
            over your editor as a Pomodoro. Absent where the API is: Safari. */}
        <If condition={pip.isSupported && isCounting}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={pip.isOpen ? "Close floating timer" : "Pop out the timer"}
            aria-pressed={pip.isOpen}
            onClick={pip.toggle}
          >
            <PictureInPicture2 className="size-4" />
          </Button>
        </If>

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
    </div>
  );
}
