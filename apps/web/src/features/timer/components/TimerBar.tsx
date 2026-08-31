"use client";

import { formatDuration, formatElapsed } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Square } from "lucide-react";

import { orpc } from "@/lib/orpc/client";

import { useElapsedSeconds, useRunningSession } from "../hooks/useRunningSession";
import { useStopTimer } from "../hooks/useTimerControls";

/**
 * The persistent timer bar.
 *
 * Docked to the bottom on every screen. Turns --focus green while running,
 * which is the one and only thing that colour is allowed to mean — that
 * reservation is why peripheral vision can tell you the clock is going.
 *
 * On mobile it sits directly above the tab bar.
 */
export function TimerBar({ className }: { className?: string }) {
  const running = useRunningSession();
  const stop = useStopTimer();

  const total = useQuery(orpc.session.totalForToday.queryOptions());

  const session = running.data?.session ?? null;
  const elapsed = useElapsedSeconds(session?.startedAt ?? null, running.data?.serverNow ?? null);

  const task = useQuery({
    ...orpc.task.get.queryOptions({ input: { id: session?.taskId ?? "" } }),
    enabled: Boolean(session?.taskId),
  });

  if (running.isPending) {
    return (
      <div className={cn("border-t border-border bg-background px-4 py-3 md:px-6", className)}>
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  const isRunning = session !== null;
  const todayTotal = (total.data?.totalSec ?? 0) + (isRunning ? elapsed : 0);

  return (
    <div
      className={cn(
        "border-t border-border transition-colors duration-150",
        isRunning ? "bg-focus/8" : "bg-background",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 px-4 md:px-6">
        {isRunning ? (
          <>
            {/* Colour is never the only signal — the dot is paired with text. */}
            <span
              aria-hidden
              className="size-2 shrink-0 animate-pulse rounded-full bg-focus motion-reduce:animate-none"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {task.data?.title ?? "Untitled session"}
              </p>
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

        <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
          {formatDuration(todayTotal)} today
        </span>
      </div>
    </div>
  );
}
