"use client";

import { joinMinutes, splitMinutes } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { cn } from "@lifedesk/ui/lib/utils";
import { X } from "lucide-react";
import { useRef, useState } from "react";

import { If } from "@/components/If";

import { HOUR_BIG_STEP, MAX_DURATION_HOURS, MINUTE_BIG_STEP } from "./constants";
import { SegmentedField } from "./SegmentedField";
import { StepperSegment } from "./StepperSegment";

import type { StepperSegmentHandle } from "./types";

/**
 * A length of time, entered as hours and minutes.
 *
 * Replaces asking for raw minutes — nobody should have to work out that two
 * and a quarter hours is 135. "Time is shown, never calculated" applies to the
 * input too, which is where it matters most.
 *
 * The draft below is why there is no syncing effect: while you are dragging or
 * typing, `draft` holds the working value; on commit it is handed upward and
 * cleared, so the prop takes over again. If the mutation fails, the prop is
 * unchanged and the field reverts on its own.
 */
export function DurationField({
  value,
  onChange,
  minMinutes = 0,
  disabled = false,
  clearable = true,
  id,
}: {
  /** Minutes. Null means unset — rendered as a placeholder, not as zero. */
  value: number | null;
  onChange: (minutes: number | null) => void;
  minMinutes?: number;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const hoursRef = useRef<StepperSegmentHandle>(null);
  const minutesRef = useRef<StepperSegmentHandle>(null);
  const [active, setActive] = useState<"hours" | "minutes">("hours");

  const current = draft ?? value;
  const parts = current === null ? null : splitMinutes(current);

  function set(hours: number, minutes: number): void {
    setDraft(Math.max(minMinutes, joinMinutes(hours, minutes)));
  }

  function commit(): void {
    if (draft === null) return;
    setDraft(null);
    if (draft !== value) onChange(draft);
  }

  return (
    <div className="group/duration inline-flex items-center gap-1">
      <SegmentedField
        id={id}
        disabled={disabled}
        onStep={(direction) =>
          (active === "hours" ? hoursRef : minutesRef).current?.step(direction)
        }
      >
        <StepperSegment
          handleRef={hoursRef}
          value={parts?.hours ?? null}
          min={0}
          max={MAX_DURATION_HOURS}
          bigStep={HOUR_BIG_STEP}
          pad={1}
          label="hours"
          placeholder="—"
          wrap={false}
          disabled={disabled}
          onChange={(hours) => set(hours, parts?.minutes ?? 0)}
          onCommit={commit}
          onOverflow={() => minutesRef.current?.focus()}
          onFocus={() => setActive("hours")}
        />
        <span aria-hidden className="pr-1 text-muted-foreground">
          h
        </span>

        <StepperSegment
          handleRef={minutesRef}
          value={parts?.minutes ?? null}
          min={0}
          max={59}
          bigStep={MINUTE_BIG_STEP}
          label="minutes"
          placeholder="——"
          disabled={disabled}
          onChange={(minutes) => set(parts?.hours ?? 0, minutes)}
          onCommit={commit}
          onFocus={() => setActive("minutes")}
        />
        <span aria-hidden className="text-muted-foreground">
          m
        </span>
      </SegmentedField>

      <If condition={clearable && current !== null && !disabled}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear"
          className={cn(
            "size-7 shrink-0 text-muted-foreground transition-opacity duration-150",
            "md:opacity-0 md:group-focus-within/duration:opacity-100 md:group-hover/duration:opacity-100",
          )}
          onClick={() => {
            setDraft(null);
            onChange(null);
          }}
        >
          <X className="size-3.5" />
        </Button>
      </If>
    </div>
  );
}
