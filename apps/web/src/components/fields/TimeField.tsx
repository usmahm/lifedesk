"use client";

import { joinMinutes, splitMinutes } from "@lifedesk/core/time";
import { useRef, useState } from "react";

import { COMMIT_DEBOUNCE_MS, MINUTE_BIG_STEP } from "./constants";
import { SegmentedField } from "./SegmentedField";
import { useDeferredCommit } from "./useDeferredCommit";
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
  // See DurationField: onChange and onCommit fire in one tick, so `draft`
  // is a render behind by the time commit reads it. Typing "14" saved 01:00.
  const draftRef = useRef<number | null>(null);
  const hoursRef = useRef<StepperSegmentHandle>(null);
  const minutesRef = useRef<StepperSegmentHandle>(null);
  // Which segment the shell's spinner drives. Survives blur, so clicking ▲
  // after tabbing away still moves the part you were last on.
  const [active, setActive] = useState<"hours" | "minutes">("hours");
  const { schedule } = useDeferredCommit(COMMIT_DEBOUNCE_MS);

  const current = draft ?? value;
  const parts = current === null ? null : splitMinutes(current);

  function set(hours: number, minutes: number): void {
    // Hours wrap at 24, so 23 + 1 lands on 00 rather than sticking.
    const next = joinMinutes(hours % 24, minutes);
    draftRef.current = next;
    setDraft(next);
  }

  function commit(): void {
    const next = draftRef.current;
    if (next === null || next === value) return;
    // The draft is handed over only when the write actually fires. That
    // relies on the caller updating `value` in the same tick — a local
    // setState, or an optimistic cache write. A caller that waits for a
    // server round trip will show its old value in the gap, which reads
    // as the edit being lost. See useOptimisticTask in useTaskMutations.
    schedule(() => {
      draftRef.current = null;
      setDraft(null);
      onChange(next);
    });
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
