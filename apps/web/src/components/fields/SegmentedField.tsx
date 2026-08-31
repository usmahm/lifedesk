"use client";

import { cn } from "@lifedesk/ui/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * The bordered shell around a set of `StepperSegment`s.
 *
 * Its whole job is to make a segmented field read as *one control*, the same
 * height and weight as every other input on the row. The first version gave
 * each segment its own filled box and its own stacked ▲▼, which stood ~92px
 * tall against a 36px input and broke the two-column grid in TaskDetailSheet.
 *
 * Classes deliberately mirror `@lifedesk/ui`'s `Input` — height, radius,
 * border, shadow and the focus ring — so the two are indistinguishable in a
 * row. `focus-within` stands in for `focus-visible` because the thing actually
 * receiving focus is a segment inside.
 */
export function SegmentedField({
  children,
  onStep,
  disabled = false,
  className,
  id,
}: {
  children: React.ReactNode;
  /** Drives whichever segment the owning field considers active. */
  onStep: (direction: 1 | -1) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "group/field inline-flex h-9 items-center rounded-md border border-input bg-transparent pr-1 pl-2.5 text-base shadow-xs transition-[color,box-shadow] md:text-sm dark:bg-input/30",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div className="flex items-center">{children}</div>
      <Spinner disabled={disabled} onStep={onStep} />
    </div>
  );
}

/**
 * One narrow ▲▼ column at the right edge, acting on the focused segment.
 *
 * Hidden at rest on desktop and revealed on hover or focus, so the field stays
 * calm in a form — but always visible on touch, where there is no hover.
 *
 * These are smaller than the 44px minimum on purpose: they are a *redundant*
 * path. The segments themselves carry the 44px hit area, and every value can
 * also be reached by typing, arrow keys or a vertical drag. A visible small
 * affordance beats an invisible correctly-sized one.
 */
function Spinner({ disabled, onStep }: { disabled: boolean; onStep: (direction: 1 | -1) => void }) {
  return (
    <div
      className={cn(
        "ml-1.5 flex shrink-0 flex-col transition-opacity duration-150",
        "md:opacity-0 md:group-focus-within/field:opacity-100 md:group-hover/field:opacity-100",
      )}
    >
      <SpinnerButton direction={1} disabled={disabled} onStep={onStep} />
      <SpinnerButton direction={-1} disabled={disabled} onStep={onStep} />
    </div>
  );
}

function SpinnerButton({
  direction,
  disabled,
  onStep,
}: {
  direction: 1 | -1;
  disabled: boolean;
  onStep: (direction: 1 | -1) => void;
}) {
  const Icon = direction === 1 ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      aria-label={direction === 1 ? "Increase" : "Decrease"}
      // Without this the button takes focus off the segment, the ring
      // disappears and the next click drives the wrong one.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onStep(direction)}
      className={cn(
        "flex h-3.5 w-7 items-center justify-center rounded-sm text-muted-foreground md:w-5",
        "hover:bg-accent hover:text-foreground disabled:pointer-events-none",
      )}
    >
      <Icon className="size-3" />
    </button>
  );
}
