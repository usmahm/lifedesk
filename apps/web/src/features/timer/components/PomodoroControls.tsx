"use client";

import { formatElapsed } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { cn } from "@lifedesk/ui/lib/utils";
import { Coffee, PictureInPicture2, Play, Square } from "lucide-react";

import { If } from "@/components/If";

import type { PomodoroPhase } from "../types";

/**
 * The Pomodoro half of the timer bar.
 *
 * Every phase offers exactly what comes next and nothing else — nothing
 * auto-starts, so the bar is where the cycle is driven from.
 *
 * There is no pause. The session model has no such concept, and faking it with
 * a stop and a start would litter the Sessions list with fragments of one
 * phase. You are either working or you are not.
 */
export function PomodoroControls({
  phase,
  label,
  taskTitle,
  seconds,
  breakKind,
  canResume,
  isPipSupported,
  isPipOpen,
  onStop,
  onStartBreak,
  onSkipBreak,
  onStartWork,
  onTogglePip,
}: {
  phase: PomodoroPhase;
  label: string;
  taskTitle: string;
  seconds: number;
  breakKind: "short" | "long";
  canResume: boolean;
  isPipSupported: boolean;
  isPipOpen: boolean;
  onStop: () => void;
  onStartBreak: () => void;
  onSkipBreak: () => void;
  onStartWork: () => void;
  onTogglePip: () => void;
}) {
  const isWork = phase === "work";
  const isCounting = phase === "work" || phase === "break";

  return (
    <>
      {/* Colour is never the only signal — the dot is paired with the label. */}
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          isWork
            ? "animate-pulse bg-focus motion-reduce:animate-none"
            : isCounting
              ? "bg-muted-foreground"
              : "bg-muted-foreground/30",
        )}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {isWork || phase === "work-ended" ? taskTitle : label}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {isWork || phase === "work-ended" ? label : taskTitle}
        </p>
      </div>

      <If condition={isCounting}>
        <span
          className={cn(
            "text-xl font-medium tabular-nums",
            isWork ? "text-focus" : "text-foreground",
          )}
          aria-label={`${formatElapsed(seconds)} remaining`}
        >
          {formatElapsed(seconds)}
        </span>
      </If>

      <If condition={phase === "work"}>
        <Button size="sm" variant="secondary" onClick={onStop}>
          <Square className="size-3.5 fill-current" />
          Stop
        </Button>
      </If>

      <If condition={phase === "work-ended"}>
        <Button size="sm" onClick={onStartBreak}>
          <Coffee className="size-3.5" />
          {breakKind === "long" ? "Long break" : "Break"}
        </Button>
      </If>

      <If condition={phase === "break"}>
        <Button size="sm" variant="ghost" onClick={onSkipBreak}>
          Skip
        </Button>
      </If>

      <If condition={phase === "break-ended" && canResume}>
        <Button size="sm" onClick={onStartWork}>
          <Play className="size-3.5 fill-current" />
          Start work
        </Button>
      </If>

      {/* Hidden where the API does not exist at all — Safari, desktop and iOS. */}
      <If condition={isPipSupported && isCounting}>
        <Button
          size="icon"
          variant="ghost"
          aria-label={isPipOpen ? "Close floating timer" : "Pop out the timer"}
          aria-pressed={isPipOpen}
          onClick={onTogglePip}
        >
          <PictureInPicture2 className="size-4" />
        </Button>
      </If>
    </>
  );
}
