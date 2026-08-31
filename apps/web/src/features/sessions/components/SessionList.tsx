"use client";

import type { TimeSession } from "@lifedesk/contracts";
import { formatDuration, formatTimeOfDay } from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

/** The day's sessions in order, beneath the grid. */
export function SessionList({
  sessions,
  timezone,
  titleFor,
}: {
  sessions: TimeSession[];
  timezone: string;
  titleFor: (taskId: string | null) => string;
}) {
  const queryClient = useQueryClient();
  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: true } }));

  const remove = useMutation(
    orpc.session.remove.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.session.key() }),
      onError: (error) => toast.error(error.message),
    }),
  );

  const ordered = [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  return (
    <ul className="divide-y divide-border">
      {ordered.map((session) => {
        const area = areas.data?.find((candidate) => candidate.id === session.areaId);

        return (
          <li key={session.id} className="group flex h-14 items-center gap-3">
            {area && <AreaDot color={area.color} label={area.name} />}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{titleFor(session.taskId)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatTimeOfDay(session.startedAt, timezone)}
                {session.endedAt && ` – ${formatTimeOfDay(session.endedAt, timezone)}`}
              </p>
            </div>

            <span className="shrink-0 text-sm tabular-nums">
              {session.durationSec === null ? (
                <span className="text-focus">running</span>
              ) : (
                formatDuration(session.durationSec)
              )}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              aria-label={`Delete session for ${titleFor(session.taskId)}`}
              disabled={session.endedAt === null}
              onClick={() => remove.mutate({ id: session.id })}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
