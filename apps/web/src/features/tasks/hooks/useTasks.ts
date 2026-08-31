"use client";

import type { CalendarDay, TaskFilters } from "@lifedesk/contracts";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

export function useTasks(filters: TaskFilters) {
  return useQuery(orpc.task.list.queryOptions({ input: { filters, page: {} } }));
}

export function useTasksForDay(day: CalendarDay | undefined) {
  return useQuery({
    ...orpc.task.list.queryOptions({
      input: { filters: { scheduledFor: day as CalendarDay }, page: {} },
    }),
    enabled: Boolean(day),
  });
}

export function useCapacityForDay(day: CalendarDay | undefined) {
  return useQuery({
    ...orpc.task.capacityForDay.queryOptions({ input: { day: day as CalendarDay } }),
    enabled: Boolean(day),
  });
}
