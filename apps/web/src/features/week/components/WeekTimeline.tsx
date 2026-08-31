"use client";

import type { CalendarDay, TaskWithMeta } from "@lifedesk/contracts";
import { formatDayNumber, formatWeekdayNarrow } from "@lifedesk/core/time";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DayGrid, tasksToGridItems } from "@/features/schedule";
import { useRunningSession } from "@/features/timer/hooks/useRunningSession";
import { orpc } from "@/lib/orpc/client";

/**
 * The week as a time grid.
 *
 * Seven columns on desktop. On mobile it falls back to a single column with
 * the day strip — seven columns on a phone is unreadable, which is the same
 * reason the list view uses an agenda there.
 */
export function WeekTimeline({
  days,
  tasks,
  timezone,
  today,
  isPending,
  onOpenTask,
}: {
  days: CalendarDay[];
  tasks: TaskWithMeta[] | undefined;
  timezone: string | undefined;
  today: CalendarDay | undefined;
  isPending: boolean;
  onOpenTask?: (task: TaskWithMeta) => void;
}) {
  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: true } }));
  const running = useRunningSession();
  const [mobileDay, setMobileDay] = useState<CalendarDay | null>(null);

  if (isPending || days.length === 0) return <Skeleton className="h-[560px]" />;

  const activeDay = mobileDay ?? today ?? days[0]!;

  const gridDays = days.map((day) => ({
    day,
    items: tasksToGridItems(
      (tasks ?? []).filter((task) => task.scheduledFor === day),
      areas.data,
      running.data?.session?.taskId,
    ),
  }));

  const handleSelect = (item: { id: string }) => {
    const task = tasks?.find((candidate) => candidate.id === item.id);
    if (task) onOpenTask?.(task);
  };

  return (
    <>
      {/* mobile: day strip + one column */}
      <div className="md:hidden">
        <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 pb-1">
          {days.map((day) => {
            const isActive = day === activeDay;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setMobileDay(day)}
                aria-current={isActive ? "date" : undefined}
                className={cn(
                  "flex h-14 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-colors duration-150",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <span>{formatWeekdayNarrow(day)}</span>
                <span className={cn("text-sm tabular-nums", day === today && "font-semibold")}>
                  {formatDayNumber(day)}
                </span>
              </button>
            );
          })}
        </div>

        <DayGrid
          days={gridDays.filter((d) => d.day === activeDay)}
          timezone={timezone}
          today={today}
          onSelectItem={handleSelect}
        />
      </div>

      {/* desktop: all seven */}
      <div className="hidden md:block">
        <DayGrid
          days={gridDays}
          timezone={timezone}
          today={today}
          pxPerHour={48}
          onSelectItem={handleSelect}
          renderHeader={(day) => (
            <p
              className={cn(
                "pb-1 text-center text-xs font-medium",
                day === today ? "text-primary" : "text-muted-foreground",
              )}
            >
              {formatWeekdayNarrow(day)}{" "}
              <span className="tabular-nums">{formatDayNumber(day)}</span>
            </p>
          )}
        />
      </div>
    </>
  );
}
