"use client";

import { formatDay, formatDuration, formatTimeOfDay, toCalendarDay } from "@lifedesk/core/time";
import { Badge } from "@lifedesk/ui/components/badge";
import { Button } from "@lifedesk/ui/components/button";
import { EmptyState } from "@lifedesk/ui/components/domain/empty-state";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/ErrorState";
import { useToday } from "@/features/settings/hooks/useToday";
import { orpc } from "@/lib/orpc/client";

/**
 * Tracked sessions, newest first.
 *
 * Sessions flagged `needsReview` are surfaced at the top — those are almost
 * always a timer left running overnight, and silently logging fourteen hours
 * would poison every report downstream.
 */
export function SessionsView() {
  const queryClient = useQueryClient();
  const today = useToday();
  const timezone = today.data?.timezone ?? "UTC";

  const sessions = useQuery(
    orpc.session.list.queryOptions({ input: { filters: {}, page: { limit: 60 } } }),
  );
  const tasks = useQuery(orpc.task.list.queryOptions({ input: { filters: {}, page: { limit: 200 } } }));

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

  const titleFor = (taskId: string | null) =>
    tasks.data?.items.find((task) => task.id === taskId)?.title ?? "Untitled session";

  if (sessions.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (sessions.isError) {
    return (
      <ErrorState
        title="Couldn't load your sessions."
        detail={sessions.error.message}
        onRetry={() => void sessions.refetch()}
      />
    );
  }

  const flagged = sessions.data.items.filter((s) => s.needsReview);
  const normal = sessions.data.items.filter((s) => !s.needsReview);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">Sessions</h1>
        <p className="text-muted-foreground mt-2 text-sm">Where the hours actually went.</p>
      </header>

      {flagged.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-warning flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <AlertTriangle className="size-3.5" />
            Needs review
          </h2>
          <p className="text-muted-foreground text-sm">
            These ran unusually long — most likely a timer that was never stopped.
          </p>

          <ul className="divide-border divide-y">
            {flagged.map((session) => (
              <li key={session.id} className="flex h-14 items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{titleFor(session.taskId)}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {formatDay(toCalendarDay(session.startedAt, timezone), "EEE d MMM")} ·{" "}
                    {formatTimeOfDay(session.startedAt, timezone)}
                  </p>
                </div>

                <Badge variant="secondary" className="tabular-nums">
                  {formatDuration(session.durationSec ?? 0)}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update.mutate({ id: session.id, needsReview: false })}
                  aria-label="Mark this session as correct"
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
            ))}
          </ul>
        </section>
      )}

      {normal.length === 0 ? (
        <EmptyState title="No sessions tracked yet. Hit play on a task to start the clock." />
      ) : (
        <ul className="divide-border divide-y">
          {normal.map((session) => (
            <li key={session.id} className="flex h-14 items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{titleFor(session.taskId)}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatDay(toCalendarDay(session.startedAt, timezone), "EEE d MMM")} ·{" "}
                  {formatTimeOfDay(session.startedAt, timezone)}
                  {session.endedAt && ` – ${formatTimeOfDay(session.endedAt, timezone)}`}
                </p>
              </div>

              <span className="text-sm tabular-nums">
                {session.durationSec === null ? (
                  <span className="text-focus">running</span>
                ) : (
                  formatDuration(session.durationSec)
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
