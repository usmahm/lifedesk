"use client";

import type { CalendarDay } from "@lifedesk/contracts";
import { formatDuration, formatTimeOfDay } from "@lifedesk/core/time";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

/**
 * The stretches already put into this task today.
 *
 * Scoped to today deliberately: the point is seeing how fragmented the day has
 * been, not the task's whole history — that belongs on the task itself.
 *
 * Renders nothing at all when the only session is the one still running. A
 * heading over a single in-progress row is noise on a screen built to remove
 * it.
 */
export function FocusSessions({
  taskId,
  day,
  timezone,
}: {
  taskId: string;
  day: CalendarDay;
  timezone: string;
}) {
  const sessions = useQuery(
    orpc.session.list.queryOptions({
      input: { filters: { taskId, from: day, to: day }, page: { limit: 50 } },
    }),
  );

  if (sessions.isPending) return <Skeleton className="h-4 w-40" />;

  // Errors stay silent here: this is a secondary panel, and an error block
  // would be louder than the thing it is reporting on.
  if (sessions.isError) return null;

  const finished = sessions.data.items.filter((session) => session.endedAt !== null);
  if (finished.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Today</h2>

      <ul className="space-y-1">
        {finished.map((session) => (
          <li
            key={session.id}
            className="flex items-baseline justify-between text-sm text-muted-foreground tabular-nums"
          >
            <span>
              {formatTimeOfDay(session.startedAt, timezone)}
              {session.endedAt && ` – ${formatTimeOfDay(session.endedAt, timezone)}`}
            </span>
            <span>{formatDuration(session.durationSec ?? 0)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
