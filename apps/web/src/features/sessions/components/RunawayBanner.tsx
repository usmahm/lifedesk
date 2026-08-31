"use client";

import type { CalendarDay } from "@lifedesk/contracts";
import { formatDay, formatDuration, toCalendarDay } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

/**
 * Sessions that ran unusually long — almost always a timer left running
 * overnight, and silently logging fourteen hours would poison every report.
 *
 * Deliberately *not* scoped to the day being viewed: a forgotten timer from
 * last Tuesday must be visible while you're looking at today, or the guard
 * only fires when you happen to browse to the right date.
 */
export function RunawayBanner({
  timezone,
  onGoToDay,
  titleFor,
}: {
  timezone: string;
  onGoToDay: (day: CalendarDay) => void;
  titleFor: (taskId: string | null) => string;
}) {
  const queryClient = useQueryClient();

  const flagged = useQuery(
    orpc.session.list.queryOptions({
      input: { filters: { needsReview: true }, page: { limit: 20 } },
    }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.session.key() });

  const update = useMutation(
    orpc.session.update.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
  const remove = useMutation(
    orpc.session.remove.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );

  const items = flagged.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section
      className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3"
      aria-label="Sessions needing review"
    >
      <h2 className="flex items-center gap-2 text-xs font-medium tracking-wide text-warning uppercase">
        <AlertTriangle className="size-3.5" />
        {items.length === 1 ? "1 session needs review" : `${items.length} sessions need review`}
      </h2>
      <p className="text-sm text-muted-foreground">
        These ran unusually long — most likely a timer that was never stopped.
      </p>

      <ul className="divide-y divide-border/60">
        {items.map((session) => {
          const day = toCalendarDay(session.startedAt, timezone);

          return (
            <li key={session.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{titleFor(session.taskId)}</p>
                <button
                  type="button"
                  onClick={() => onGoToDay(day)}
                  className="rounded-sm text-xs text-muted-foreground tabular-nums underline underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {formatDay(day, "EEE d MMM")} · {formatDuration(session.durationSec ?? 0)}
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => update.mutate({ id: session.id, needsReview: false })}
              >
                <Check className="size-3.5" />
                Keep
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => remove.mutate({ id: session.id })}
              >
                Discard
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
