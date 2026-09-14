"use client";

import { cyclePosition, nextBreakKind, remainingSeconds } from "@lifedesk/core/pomodoro";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { browserNow } from "@/lib/clock";
import { orpc } from "@/lib/orpc/client";

import {
  EMPTY_CYCLE,
  readCycle,
  readServerCycle,
  subscribeCycle,
  writeCycle,
} from "../lib/pomodoro-storage";
import { notify, playChime } from "../lib/notify";
import type { PomodoroCycle, PomodoroPhase } from "../types";
import { useElapsedSeconds, useRunningSession } from "./useRunningSession";
import { useStartTimer, useStopTimer } from "./useTimerControls";

/**
 * The Pomodoro cycle.
 *
 * Split state on purpose. The work phase is an ordinary `TimeSession` with
 * `source: "pomodoro"` — already server-authoritative, already skew-corrected,
 * already surviving refresh and sleep. Only the break and the cycle count are
 * local, because a five-minute break is a single-device thing that would
 * otherwise need a schema change to earn nothing.
 *
 * Nothing auto-starts. Phases do auto-*end*: at its target the work session
 * stops, so a 25-minute pomodoro records 25 minutes rather than however long
 * you took to notice. Then it waits.
 *
 * **`drive` must be true in exactly one mounted component.** The side effects —
 * stopping the session at its target, incrementing the cycle, the chime and
 * the notification — are not idempotent across instances: two drivers would
 * advance `completedWorkPhases` twice for one phase and race each other's
 * writes. `PomodoroEngine` is the one driver; everything else reads.
 */
export function usePomodoro({ drive = false }: { drive?: boolean } = {}) {
  const settings = useQuery(orpc.settings.get.queryOptions());
  const today = useQuery(orpc.settings.today.queryOptions());
  const running = useRunningSession();
  const stop = useStopTimer();
  const start = useStartTimer();

  const cycle = useSyncExternalStore(subscribeCycle, readCycle, readServerCycle);

  const session = running.data?.session ?? null;
  const isPomodoroSession = session?.source === "pomodoro";

  const elapsed = useElapsedSeconds(
    isPomodoroSession ? session.startedAt : null,
    running.data?.serverNow ?? null,
  );

  const workSec = (settings.data?.pomodoroWorkMin ?? 25) * 60;
  const longBreakEvery = settings.data?.longBreakEvery ?? 4;

  // A fresh day starts a fresh cycle, so yesterday's four phases don't hand
  // you a long break on this morning's first.
  //
  // Memoised because the rollover branch builds a new object: without it every
  // callback below would get a fresh dependency on every render.
  const day = today.data?.day ?? "";
  const current: PomodoroCycle = useMemo(
    () =>
      day && cycle.cycleDay && cycle.cycleDay !== day ? { ...EMPTY_CYCLE, cycleDay: day } : cycle,
    [cycle, day],
  );

  const nowMs = useLiveNowMs(current.breakEndsAt !== null);

  const phase: PomodoroPhase = isPomodoroSession
    ? "work"
    : current.breakEndsAt !== null
      ? nowMs < current.breakEndsAt
        ? "break"
        : "break-ended"
      : current.awaitingBreak
        ? "work-ended"
        : "idle";

  const breakSec =
    (current.breakKind === "long"
      ? (settings.data?.longBreakMin ?? 15)
      : (settings.data?.shortBreakMin ?? 5)) * 60;

  const remaining =
    phase === "work"
      ? remainingSeconds(workSec, elapsed)
      : phase === "break" && current.breakEndsAt !== null
        ? Math.max(0, Math.ceil((current.breakEndsAt - nowMs) / 1000))
        : 0;

  const soundEnabled = settings.data?.soundEnabled ?? true;

  /**
   * End the work phase.
   *
   * A second tab racing us here gets CONFLICT from `session.stop` — the
   * expected outcome of a race, not an error worth a toast, so it is swallowed
   * rather than surfaced. The cycle advances either way: the phase is over in
   * both tabs regardless of which one's stop landed.
   */
  const endWorkPhase = useCallback(
    (sessionId: string, taskId: string | null) => {
      stop.mutate({ id: sessionId }, { onError: () => undefined });

      const completed = current.completedWorkPhases + 1;

      writeCycle({
        breakEndsAt: null,
        breakKind: nextBreakKind(completed, longBreakEvery),
        completedWorkPhases: completed,
        awaitingBreak: true,
        cycleDay: day,
        lastTaskId: taskId,
      });

      if (soundEnabled) playChime("work-end");
      notify("Work phase done", "Time for a break.");
    },
    [current.completedWorkPhases, day, longBreakEvery, soundEnabled, stop],
  );

  // Fires once per session. A ref rather than state: this must not re-render,
  // and reading a ref inside an effect is the sanctioned place for one.
  const endedSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (!drive) return;
    if (phase !== "work" || remaining > 0 || !session) return;
    if (endedSessionId.current === session.id) return;

    endedSessionId.current = session.id;
    endWorkPhase(session.id, session.taskId);
  }, [drive, endWorkPhase, phase, remaining, session]);

  const announcedBreakEnd = useRef<number | null>(null);

  useEffect(() => {
    if (!drive) return;
    if (phase !== "break-ended" || current.breakEndsAt === null) return;
    if (announcedBreakEnd.current === current.breakEndsAt) return;

    announcedBreakEnd.current = current.breakEndsAt;

    if (soundEnabled) playChime("break-end");
    notify("Break over", "Start the next phase when you're ready.");
  }, [current.breakEndsAt, drive, phase, soundEnabled]);

  const startBreak = useCallback(() => {
    writeCycle({
      ...current,
      // Absolute, never a countdown — that is what survives a refresh.
      breakEndsAt: browserNow().getTime() + breakSec * 1000,
      awaitingBreak: false,
      cycleDay: day,
    });
  }, [breakSec, current, day]);

  const skipBreak = useCallback(() => {
    writeCycle({ ...current, breakEndsAt: null, awaitingBreak: false, cycleDay: day });
  }, [current, day]);

  /** Starts the next work phase on whatever the last one was on. */
  const startWork = useCallback(() => {
    if (!current.lastTaskId) return;

    writeCycle({ ...current, breakEndsAt: null, awaitingBreak: false, cycleDay: day });
    start.mutate({ taskId: current.lastTaskId, source: "pomodoro" });
  }, [current, day, start]);

  return {
    phase,
    remaining,
    breakKind: current.breakKind,
    position: cyclePosition(current.completedWorkPhases, longBreakEvery),
    longBreakEvery,
    session,
    canResume: current.lastTaskId !== null,
    isPending: settings.isPending || running.isPending,
    startBreak,
    skipBreak,
    startWork,
  };
}

/**
 * Wall-clock milliseconds, ticking only while something needs it.
 *
 * The work phase already has `useElapsedSeconds`; this exists for the break,
 * which is compared against a local instant and so has no server time to
 * correct against.
 */
function useLiveNowMs(active: boolean): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!active) return () => undefined;

      const timer = setInterval(onChange, 1000);
      // A tab that slept must not show a stale break.
      document.addEventListener("visibilitychange", onChange);

      return () => {
        clearInterval(timer);
        document.removeEventListener("visibilitychange", onChange);
      };
    },
    [active],
  );

  return useSyncExternalStore(
    subscribe,
    () => Math.floor(browserNow().getTime() / 1000) * 1000,
    () => 0,
  );
}
