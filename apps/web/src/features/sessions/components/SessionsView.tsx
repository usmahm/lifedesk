"use client";

import type { CalendarDay } from "@lifedesk/contracts";
import {
  addDays,
  formatDay,
  formatDayRelative,
  formatDuration,
} from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { EmptyState } from "@lifedesk/ui/components/domain/empty-state";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { DayGrid, sessionsToGridItems, useNowMinute } from "@/features/schedule";
import { useToday } from "@/features/settings/hooks/useToday";
import { orpc } from "@/lib/orpc/client";

import { RunawayBanner } from "./RunawayBanner";
import { SessionList } from "./SessionList";

/**
 * Where the hours actually went, one day at a time.
 *
 * Day-scoped rather than an endless log: "what did I do yesterday" is the
 * question this page exists to answer, and a flat list reprinting its own date
 * on every row answers it badly.
 *
 * Note this grid plots *actuals*. Today and Week plot plans. Overlaying the
 * two is deliberately deferred — see docs/PLAN.md.
 */
export function SessionsView() {
  const today = useToday();
  const timezone = today.data?.timezone ?? "UTC";
  const nowMinute = useNowMinute(today.data?.timezone) ?? 0;

  const [day, setDay] = useState<CalendarDay | null>(null);
  const activeDay = day ?? today.data?.day;

  const sessions = useQuery({
    ...orpc.session.list.queryOptions({
      input: {
        filters: { from: activeDay as CalendarDay, to: activeDay as CalendarDay },
        page: { limit: 100 },
      },
    }),
    enabled: Boolean(activeDay),
  });

  const tasks = useQuery(
    orpc.task.list.queryOptions({ input: { filters: {}, page: { limit: 200 } } }),
  );
  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: true } }));

  const titleFor = (taskId: string | null) =>
    tasks.data?.items.find((task) => task.id === taskId)?.title ?? "Untitled session";

  if (today.isError) {
    return (
      <ErrorState
        title="Couldn't work out what day it is."
        detail={today.error.message}
        onRetry={() => void today.refetch()}
      />
    );
  }

  const items = sessions.data?.items ?? [];
  const totalSec = items.reduce((sum, session) => sum + (session.durationSec ?? 0), 0);

  const byArea = new Map<string | null, number>();
  for (const session of items) {
    byArea.set(session.areaId, (byArea.get(session.areaId) ?? 0) + (session.durationSec ?? 0));
  }

  const gridItems = sessionsToGridItems(
    items,
    areas.data,
    timezone,
    (session) => titleFor(session.taskId),
    nowMinute,
  );

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="font-serif text-3xl leading-tight md:text-4xl">Sessions</h1>
          <p className="text-muted-foreground mt-2 text-sm">Where the hours actually went.</p>
        </div>

        {/* The runaway guard stays visible from any day — burying a forgotten
            timer in a day you aren't looking at defeats the point of it. */}
        <RunawayBanner timezone={timezone} onGoToDay={setDay} titleFor={titleFor} />

        <div className="flex items-center justify-between gap-3">
          {today.isPending || !activeDay ? (
            <Skeleton className="h-7 w-40" />
          ) : (
            <div>
              <p className="text-base font-medium">
                {formatDayRelative(activeDay, today.data.day)}
              </p>
              <p className="text-muted-foreground text-xs">{formatDay(activeDay, "d MMMM yyyy")}</p>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous day"
              disabled={!activeDay}
              onClick={() => activeDay && setDay(addDays(activeDay, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {activeDay !== today.data?.day && (
              <Button variant="ghost" size="sm" onClick={() => setDay(null)}>
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next day"
              disabled={!activeDay}
              onClick={() => activeDay && setDay(addDays(activeDay, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {sessions.isError ? (
        <ErrorState
          title="Couldn't load that day."
          detail={sessions.error.message}
          onRetry={() => void sessions.refetch()}
        />
      ) : sessions.isPending || !activeDay ? (
        <Skeleton className="h-105" />
      ) : items.length === 0 ? (
        <EmptyState
          title={
            activeDay === today.data?.day
              ? "Nothing tracked yet today. Hit play on a task to start the clock."
              : "Nothing was tracked on this day."
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-lg font-medium tabular-nums">{formatDuration(totalSec)}</p>
            {[...byArea.entries()]
              .sort(([, a], [, b]) => b - a)
              .map(([areaId, seconds]) => {
                const area = areas.data?.find((candidate) => candidate.id === areaId);
                return (
                  <span
                    key={areaId ?? "none"}
                    className="text-muted-foreground flex items-center gap-1.5 text-xs"
                  >
                    {area && <AreaDot color={area.color} label={area.name} />}
                    {area?.name ?? "No area"}
                    <span className="tabular-nums">{formatDuration(seconds)}</span>
                  </span>
                );
              })}
          </div>

          <DayGrid
            days={[{ day: activeDay, items: gridItems }]}
            timezone={today.data?.timezone}
            today={today.data?.day}
          />

          <SessionList
            sessions={items}
            timezone={timezone}
            titleFor={titleFor}
          />
        </>
      )}
    </div>
  );
}
