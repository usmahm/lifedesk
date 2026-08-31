"use client";

import { joinMinutes, splitMinutes } from "@lifedesk/core/time";
import { useRef, useState } from "react";

import { MINUTE_BIG_STEP } from "./constants";
import { SegmentedField } from "./SegmentedField";
import { StepperSegment } from "./StepperSegment";

import type { StepperSegmentHandle } from "./types";

/**
 * A point in the day, as `HH : MM`.
 *
 * 24-hour, because the whole app is — `formatMinuteOfDay`, `formatTimeOfDay`
 * and the grid axis all render 24-hour. A 12-hour preference would be a
 * `UserSettings` field plus a pass over every renderer, not a prop here.
 *
 * Segments make a malformed time unrepresentable, so callers no longer need to
 * parse or validate the shape — only real rules, like an end after its start.
 */
export function TimeField({
  value,
  onChange,
  disabled = false,
  id,
}: {
  /** Minute of day, 0–1439. Null renders placeholders. */
  value: number | null;
  onChange: (minuteOfDay: number) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const hoursRef = useRef<StepperSegmentHandle>(null);
  const minutesRef = useRef<StepperSegmentHandle>(null);
  // Which segment the shell's spinner drives. Survives blur, so clicking ▲
  // after tabbing away still moves the part you were last on.
  const [active, setActive] = useState<"hours" | "minutes">("hours");

  const current = draft ?? value;
  const parts = current === null ? null : splitMinutes(current);

  function set(hours: number, minutes: number): void {
    // Hours wrap at 24, so 23 + 1 lands on 00 rather than sticking.
    setDraft(joinMinutes(hours % 24, minutes));
  }

  function commit(): void {
    if (draft === null) return;
    setDraft(null);
    if (draft !== value) onChange(draft);
  }

  return (
    <SegmentedField
      id={id}
      disabled={disabled}
      onStep={(direction) => (active === "hours" ? hoursRef : minutesRef).current?.step(direction)}
    >
      <StepperSegment
        handleRef={hoursRef}
        value={parts?.hours ?? null}
        min={0}
        max={23}
        bigStep={1}
        label="hours"
        disabled={disabled}
        onChange={(hours) => set(hours, parts?.minutes ?? 0)}
        onCommit={commit}
        onOverflow={() => minutesRef.current?.focus()}
        onFocus={() => setActive("hours")}
      />

      <span aria-hidden className="px-0.5 text-muted-foreground">
        :
      </span>

      <StepperSegment
        handleRef={minutesRef}
        value={parts?.minutes ?? null}
        min={0}
        max={59}
        bigStep={MINUTE_BIG_STEP}
        label="minutes"
        disabled={disabled}
        onChange={(minutes) => set(parts?.hours ?? 0, minutes)}
        onCommit={commit}
        onFocus={() => setActive("minutes")}
      />
    </SegmentedField>
  );
}
