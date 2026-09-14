"use client";

import { cn } from "@lifedesk/ui/lib/utils";

import type { TimerMode } from "../types";

const MODES: { value: TimerMode; label: string }[] = [
  { value: "timer", label: "Timer" },
  { value: "pomodoro", label: "Pomodoro" },
];

/**
 * Which clock the ▶ on a task starts.
 *
 * Lives here rather than on each task row so the decision is made once. The
 * row already carries seven controls and the design calls it full.
 *
 * Disabled while something is running — switching mode mid-phase would leave
 * a session running under rules it was not started with.
 */
export function TimerModeToggle({
  mode,
  onChange,
  disabled = false,
}: {
  mode: TimerMode;
  onChange: (mode: TimerMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Timer mode"
      className={cn(
        "inline-flex shrink-0 rounded-md border border-border p-0.5",
        disabled && "opacity-50",
      )}
    >
      {MODES.map((option) => {
        const isActive = option.value === mode;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-sm px-2 py-1 text-xs transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              "disabled:cursor-not-allowed",
              isActive
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
