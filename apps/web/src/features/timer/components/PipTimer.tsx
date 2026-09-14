"use client";

import { formatElapsed } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { cn } from "@lifedesk/ui/lib/utils";
import { Square } from "lucide-react";

import type { PomodoroPhase } from "../types";

/**
 * What the floating window shows.
 *
 * A glance target, not a second copy of the app: phase, clock, what you are
 * on, and the one action that matters. Anything more and it stops being
 * readable at a corner-of-the-eye size.
 *
 * The 40px tabular face is the one the design reserves for timers, and
 * `--focus` still means only "a work session is running" — so a break is
 * rendered muted rather than green.
 */
export function PipTimer({
  phase,
  label,
  taskTitle,
  seconds,
  onStop,
}: {
  phase: PomodoroPhase;
  label: string;
  taskTitle: string;
  seconds: number;
  onStop: () => void;
}) {
  const isWork = phase === "work";

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-1 px-4 text-center">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>

      <p
        className={cn(
          "text-[40px] leading-none font-medium tabular-nums",
          isWork ? "text-focus" : "text-foreground",
        )}
      >
        {formatElapsed(seconds)}
      </p>

      <p className="line-clamp-1 max-w-full text-sm text-muted-foreground">{taskTitle}</p>

      {isWork && (
        <Button size="sm" variant="secondary" className="mt-2" onClick={onStop}>
          <Square className="size-3.5 fill-current" />
          Stop
        </Button>
      )}
    </div>
  );
}
