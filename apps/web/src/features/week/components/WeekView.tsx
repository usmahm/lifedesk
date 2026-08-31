"use client";

import type { CalendarDay, TaskWithMeta } from "@lifedesk/contracts";
import {
  addDays,
  formatDay,
  formatDayNumber,
  formatDayShort,
  formatWeekdayNarrow,
  startOfWeek,
  weekDays,
} from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";
import { CalendarRange, ChevronLeft, ChevronRight, Rows3 } from "lucide-react";
import { useState } from "react";

import { If } from "@/components/If";
import { ErrorState } from "@/components/ErrorState";
import { useToday } from "@/features/settings/hooks/useToday";
import { TaskDetailSheet } from "@/features/tasks/components/TaskDetailSheet";
import { TaskRow } from "@/features/tasks/components/TaskRow";
import { useTasks } from "@/features/tasks/hooks/useTasks";

import { useWeekViewMode } from "../hooks/useWeekViewMode";
import { WeekTimeline } from "./WeekTimeline";

/**
 * The week.
 *
 * Seven columns on desktop; a vertical agenda with a day strip on mobile.
 * This is a genuine structural difference, not a breakpoint class — seven
 * columns on a phone is unreadable. See .claude/rules/ui-components.md.
 */
export function WeekView() {
  const today = useToday();
  const [weekOffset, setWeekOffset] = useState(0);
  const [openTask, setOpenTask] = useState<TaskWithMeta | null>(null);
  const [mode, setMode] = useWeekViewMode();

  const anchor =
    today.data && addDays(startOfWeek(today.data.day, today.data.weekStartsOn), weekOffset * 7);
  const days = anchor && today.data ? weekDays(anchor, today.data.weekStartsOn) : [];

  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const activeDay = selectedDay ?? today.data?.day ?? days[0];

  const tasks = useTasks(days.length > 0 ? { scheduledFrom: days[0], scheduledTo: days[6] } : {});

  if (today.isError) {
    return (
      <ErrorState
        title="Couldn't load your week."
        detail={today.error.message}
        onRetry={() => void today.refetch()}
      />
    );
  }

  const byDay = new Map<string, TaskWithMeta[]>();
  for (const task of tasks.data?.items ?? []) {
    if (!task.scheduledFor) continue;
    const bucket = byDay.get(task.scheduledFor) ?? [];
    bucket.push(task);
    byDay.set(task.scheduledFor, bucket);
  }

  const selected = openTask
    ? (tasks.data?.items.find((t) => t.id === openTask.id) ?? openTask)
    : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        {today.isPending || !anchor ? (
          <Skeleton className="h-8 w-56" />
        ) : (
          <h1 className="font-serif text-2xl leading-tight md:text-3xl">
            {formatDay(anchor, "d MMM")} – {formatDay(days[6]!, "d MMM")}
          </h1>
        )}

        <div className="flex items-center gap-1">
          <div className="mr-1 flex rounded-md bg-muted p-0.5" role="group" aria-label="Week view">
            <Button
              variant={mode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2"
              aria-pressed={mode === "list"}
              onClick={() => setMode("list")}
            >
              <Rows3 className="size-3.5" />
              <span className="sr-only sm:not-sr-only">List</span>
            </Button>
            <Button
              variant={mode === "timeline" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2"
              aria-pressed={mode === "timeline"}
              onClick={() => setMode("timeline")}
            >
              <CalendarRange className="size-3.5" />
              <span className="sr-only sm:not-sr-only">Timeline</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous week"
            onClick={() => setWeekOffset((n) => n - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <If condition={weekOffset !== 0}>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              This week
            </Button>
          </If>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next week"
            onClick={() => setWeekOffset((n) => n + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      {tasks.isError ? (
        <ErrorState
          title="Couldn't load these tasks."
          detail={tasks.error.message}
          onRetry={() => void tasks.refetch()}
        />
      ) : mode === "timeline" ? (
        <WeekTimeline
          days={days}
          tasks={tasks.data?.items}
          timezone={today.data?.timezone}
          today={today.data?.day}
          isPending={tasks.isPending || today.isPending}
          onOpenTask={setOpenTask}
        />
      ) : (
        <>
          {/* ---- mobile: day strip + agenda ---- */}
          <div className="md:hidden">
            <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 pb-1">
              {days.map((day) => {
                const isActive = day === activeDay;
                const isToday = day === today.data?.day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    aria-current={isActive ? "date" : undefined}
                    className={cn(
                      "flex h-14 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <span>{formatWeekdayNarrow(day)}</span>
                    <span className={cn("text-sm tabular-nums", isToday && "font-semibold")}>
                      {formatDayNumber(day)}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeDay && (
              <DayColumn
                day={activeDay}
                tasks={byDay.get(activeDay) ?? []}
                isPending={tasks.isPending}
                onOpenTask={setOpenTask}
                showHeading={false}
              />
            )}
          </div>

          {/* ---- desktop: seven columns ---- */}
          <div className="hidden gap-x-4 gap-y-6 md:grid md:grid-cols-2 lg:grid-cols-3">
            {days.map((day) => (
              <DayColumn
                key={day}
                day={day}
                tasks={byDay.get(day) ?? []}
                isPending={tasks.isPending}
                isToday={day === today.data?.day}
                onOpenTask={setOpenTask}
              />
            ))}
          </div>
        </>
      )}

      <TaskDetailSheet task={selected} onOpenChange={(open) => !open && setOpenTask(null)} />
    </div>
  );
}

function DayColumn({
  day,
  tasks,
  isPending,
  isToday,
  onOpenTask,
  showHeading = true,
}: {
  day: CalendarDay;
  tasks: TaskWithMeta[];
  isPending: boolean;
  isToday?: boolean;
  onOpenTask: (task: TaskWithMeta) => void;
  showHeading?: boolean;
}) {
  return (
    <section className="min-w-0">
      <If condition={showHeading}>
        <h2
          className={cn(
            "mb-1 px-2 text-xs font-medium tracking-wide uppercase",
            isToday ? "text-primary" : "text-muted-foreground",
          )}
        >
          {formatDayShort(day)}
        </h2>
      </If>

      {isPending ? (
        <Skeleton className="mx-2 h-10" />
      ) : tasks.length === 0 ? (
        // An empty day is a normal, good state — it should read as space,
        // not as an error.
        <p className="px-2 py-2 text-xs text-muted-foreground/60">Nothing planned</p>
      ) : (
        <ul className="-mx-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskRow task={task} onOpen={onOpenTask} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
