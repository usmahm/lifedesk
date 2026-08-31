/**
 * What a `StepperSegment` exposes to the field that owns it.
 *
 * The shell's ▲▼ spinner sits outside the segments, so it needs a way to drive
 * whichever one has focus. It says only "up" or "down": the segment applies
 * its own step, wrap and clamp rules, so none of that is re-derived in the
 * shell — where it would drift.
 */
export type StepperSegmentHandle = {
  focus: () => void;
  step: (direction: 1 | -1) => void;
};
