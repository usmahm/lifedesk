import { startOfWeek, weekDays } from "@lifedesk/core/time";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { WeekView } from "@/features/week/components/WeekView";
import { serverOrpc } from "@/lib/orpc/server";
import { makeQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Week" };

export default async function WeekPage() {
  const queryClient = makeQueryClient();
  const orpc = serverOrpc();

  const today = await queryClient.fetchQuery(orpc.settings.today.queryOptions());

  // Only the current week is prefetched — paging to another week is a
  // deliberate action and can pay for its own fetch.
  const days = weekDays(startOfWeek(today.day, today.weekStartsOn), today.weekStartsOn);

  await Promise.all([
    queryClient.prefetchQuery(
      orpc.task.list.queryOptions({
        input: { filters: { scheduledFrom: days[0], scheduledTo: days[6] }, page: {} },
      }),
    ),
    queryClient.prefetchQuery(orpc.area.list.queryOptions({ input: { includeArchived: false } })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WeekView />
    </HydrationBoundary>
  );
}
