"use client";

import type { CalendarDay } from "@lifedesk/contracts";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";
import { useRef } from "react";

import { INTENTION_MAX_LENGTH } from "../constants";
import { useDayPlan, useSetIntention } from "../hooks/useDayPlan";

/**
 * One line naming what today is for.
 *
 * The design makes this the loudest thing on the screen after the running
 * timer — a day holding five tasks and no point to them is the failure it is
 * meant to catch. It shares the serif with the date and nothing else.
 *
 * Uncontrolled, mounted only once its value has loaded. React 19's rules here
 * forbid `setState` in an effect, so there is no syncing it after the fact:
 * the query resolves first, then the input mounts with the right
 * `defaultValue`, and the DOM owns it from there.
 */
export function IntentionLine({ day }: { day: CalendarDay | undefined }) {
  const plan = useDayPlan(day);
  const setIntention = useSetIntention();
  const ref = useRef<HTMLInputElement>(null);

  if (!day || plan.isPending) {
    return <Skeleton className="h-7 w-72" />;
  }

  const saved = plan.data?.intention ?? "";

  function commit(): void {
    const next = ref.current?.value.trim() ?? "";
    if (next === saved) return;
    setIntention.mutate({ day: day as CalendarDay, intention: next || null });
  }

  return (
    <input
      ref={ref}
      // Remounts when the day changes or the server value does, which re-seeds
      // the DOM value without an effect.
      key={`${day}:${saved}`}
      defaultValue={saved}
      maxLength={INTENTION_MAX_LENGTH}
      aria-label="What today is for"
      placeholder="What is today for?"
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          ref.current?.blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          if (ref.current) ref.current.value = saved;
          ref.current?.blur();
        }
      }}
      className={cn(
        "w-full rounded-md border border-transparent bg-transparent py-1 font-serif text-xl leading-snug outline-none md:text-2xl",
        "placeholder:text-muted-foreground/60 placeholder:italic",
        "hover:border-border focus:border-ring focus:px-2",
        "transition-[padding,border-color] duration-150",
      )}
    />
  );
}
