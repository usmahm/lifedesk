"use client";

import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

import { describePhase } from "../lib/describe-phase";
import { usePomodoro } from "../hooks/usePomodoro";
import { useElapsedSeconds, useRunningSession } from "../hooks/useRunningSession";
import { useStopTimer } from "../hooks/useTimerControls";
import { useTimerMode } from "../hooks/useTimerMode";
import { PipTimer } from "./PipTimer";

/**
 * What goes inside the floating window.
 *
 * Split from `PipProvider` so it is only mounted while a window is actually
 * open. The provider sits at the root, above the sign-in pages too — running
 * these queries there would mean unauthenticated calls on every visit, and the
 * 401s would land in the logs.
 *
 * Reads the cycle; never drives it. `PomodoroEngine` is the single driver.
 */
export function PipContent() {
  const [mode] = useTimerMode();
  const running = useRunningSession();
  const pomodoro = usePomodoro();
  const stop = useStopTimer();

  const session = running.data?.session ?? null;
  const elapsed = useElapsedSeconds(session?.startedAt ?? null, running.data?.serverNow ?? null);

  const task = useQuery({
    ...orpc.task.get.queryOptions({ input: { id: session?.taskId ?? "" } }),
    enabled: Boolean(session?.taskId),
  });

  const isPomodoro = mode === "pomodoro" && pomodoro.phase !== "idle";

  return (
    <PipTimer
      phase={isPomodoro ? pomodoro.phase : session ? "work" : "idle"}
      // A plain timer has no phase, so the task carries the top line instead of
      // repeating itself underneath.
      label={
        isPomodoro
          ? describePhase(pomodoro.phase, pomodoro.position, pomodoro.longBreakEvery)
          : session
            ? "Tracking"
            : "Nothing running"
      }
      taskTitle={task.data?.title ?? "Untitled session"}
      seconds={isPomodoro ? pomodoro.remaining : elapsed}
      onStop={() => session && stop.mutate({ id: session.id })}
    />
  );
}
