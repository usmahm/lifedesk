"use client";

import { cn } from "@lifedesk/ui/lib/utils";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { DRAG_PX_PER_STEP, DRAG_THRESHOLD_PX } from "./constants";
import { applyDigit, EMPTY_BUFFER } from "./digit-entry";

import type { StepperSegmentHandle } from "./types";

/**
 * One segment of a segmented field — the hours part, or the minutes part.
 *
 * A stepper that is only ▲▼ takes fifteen clicks to reach two hours, so every
 * segment also accepts typed digits, arrow keys and a vertical drag. Clicking
 * the arrows is the slowest path rather than the only one.
 *
 * This renders as bare inline text, not a box: the border and background
 * belong to the `SegmentedField` shell wrapping it, so a field reads as one
 * control at the same height as every other input. Filled per-segment boxes
 * are what made the first version tower over the rows around it.
 *
 * `role="spinbutton"` is the correct ARIA role for a number you step through,
 * so screen readers get the right semantics without anything invented. The
 * drag is an enhancement — every action has a keyboard equivalent, per
 * .claude/rules/ui-components.md.
 */
export function StepperSegment({
  value,
  min,
  max,
  step = 1,
  bigStep = 5,
  pad = 2,
  label,
  placeholder,
  wrap = true,
  disabled = false,
  handleRef,
  onChange,
  onCommit,
  onOverflow,
  onFocus,
}: {
  /** Null renders the placeholder — "no value yet" rather than zero. */
  value: number | null;
  min: number;
  max: number;
  step?: number;
  bigStep?: number;
  /** Digits to zero-pad to. 1 for a duration's hours, 2 for a clock. */
  pad?: number;
  label: string;
  placeholder?: string;
  /** Wrap past the ends, so 23 + 1 is 0. */
  wrap?: boolean;
  disabled?: boolean;
  /** Lets the owning field focus this segment and drive it from the spinner. */
  handleRef?: React.RefObject<StepperSegmentHandle | null>;
  onChange: (value: number) => void;
  /** Fires once the interaction settles — the moment worth persisting. */
  onCommit?: () => void;
  /** Typed enough digits that no more can fit; move to the next segment. */
  onOverflow?: () => void;
  /** Lets the owning field remember which segment the spinner should drive. */
  onFocus?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Digit entry buffer. A ref, not state — it must not drive a render, and it
  // is only ever read inside event handlers.
  const buffer = useRef(EMPTY_BUFFER);

  const clamp = useCallback(
    (next: number): number => {
      if (next > max) return wrap ? min : max;
      if (next < min) return wrap ? max : min;
      return next;
    },
    [max, min, wrap],
  );

  const nudge = useCallback(
    (delta: number) => {
      if (disabled) return;
      buffer.current = EMPTY_BUFFER;
      onChange(clamp((value ?? min) + delta));
    },
    [clamp, disabled, min, onChange, value],
  );

  /**
   * Wheel steps the value, but ONLY while focused — otherwise the segment
   * eats page scroll the moment the pointer crosses it, which is the classic
   * way these controls go wrong.
   *
   * Registered manually because React's synthetic wheel listener is passive,
   * so preventDefault there does nothing.
   */
  useEffect(() => {
    const element = ref.current;
    if (!element || !isFocused || disabled) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      nudge(event.deltaY < 0 ? step : -step);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [disabled, isFocused, nudge, step]);

  useImperativeHandle(
    handleRef,
    () => ({
      focus: () => ref.current?.focus(),
      step: (direction: 1 | -1) => {
        nudge(direction * step);
        onCommit?.();
      },
    }),
    [nudge, onCommit, step],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (disabled) return;

    const amount = event.shiftKey ? bigStep : step;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        nudge(amount);
        onCommit?.();
        return;
      case "ArrowDown":
        event.preventDefault();
        nudge(-amount);
        onCommit?.();
        return;
      case "Home":
        event.preventDefault();
        onChange(min);
        onCommit?.();
        return;
      case "End":
        event.preventDefault();
        onChange(max);
        onCommit?.();
        return;
      case "Backspace":
      case "Delete":
        event.preventDefault();
        buffer.current = EMPTY_BUFFER;
        onChange(min);
        onCommit?.();
        return;
    }

    if (!/^\d$/.test(event.key)) return;
    event.preventDefault();

    // The rules live in digit-entry.ts as a pure function — the edge cases
    // ("6" in a 0–59 segment, a pause mid-number) are much easier to reason
    // about there than inside a pointer-and-keyboard handler.
    const entry = applyDigit(buffer.current, event.key, max, performance.now());

    buffer.current = entry.buffer;
    onChange(clamp(entry.value));

    if (entry.complete) {
      onCommit?.();
      onOverflow?.();
    }
  }

  /** Vertical scrub. Up increases, which matches the arrow above. */
  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (disabled || event.button !== 0) return;

    const startY = event.clientY;
    const startValue = value ?? min;
    let moved = false;

    ref.current?.focus();

    const onMove = (move: PointerEvent) => {
      const distance = startY - move.clientY;
      if (!moved && Math.abs(distance) < DRAG_THRESHOLD_PX) return;

      moved = true;
      // Suppress text selection once this is genuinely a drag.
      move.preventDefault();
      onChange(clamp(startValue + Math.round(distance / DRAG_PX_PER_STEP) * step));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (moved) onCommit?.();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const display =
    value === null ? (placeholder ?? "—".repeat(pad)) : String(value).padStart(pad, "0");

  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuenow={value ?? undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={value === null ? "Not set" : `${value} ${label}`}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onFocus={() => {
        setIsFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setIsFocused(false);
        buffer.current = EMPTY_BUFFER;
        onCommit?.();
      }}
      // `min-width` in `ch` with tabular figures keeps the field from
      // twitching as 9 becomes 10.
      style={{ minWidth: `${pad}ch` }}
      className={cn(
        "relative touch-none rounded-sm text-center tabular-nums transition-colors duration-150 select-none",
        "hover:bg-accent/60 focus:bg-accent focus:text-accent-foreground focus:outline-none",
        disabled ? "cursor-not-allowed" : "cursor-ns-resize",
        value === null && "text-muted-foreground",
        // The visible box matches Input's height so rows stay aligned; the
        // *hit* area is grown to 44px with a pseudo-element instead, which
        // satisfies touch without making the control taller.
        "after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
      )}
    >
      {display}
    </div>
  );
}
