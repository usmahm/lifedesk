import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { TodayView } from "@/features/today/components/TodayView";
import { serverOrpc } from "@/lib/orpc/server";
import { makeQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Today" };

/**
 * Prefetched on the server so the first paint already has the day's work.
 *
 * The server-side client calls the router in-process — no HTTP round trip,
 * and the public endpoint isn't touched during a page load.
 *
 * The query options here must match the client hooks exactly, or the cache
 * misses and the page refetches everything anyway.
 */
export default async function TodayPage() {
  const queryClient = makeQueryClient();
  const orpc = serverOrpc();

  // Needed before the others: everything else is scoped to the day.
  const today = await queryClient.fetchQuery(orpc.settings.today.queryOptions());

  await Promise.all([
    queryClient.prefetchQuery(
      orpc.task.list.queryOptions({
        input: { filters: { scheduledFor: today.day }, page: {} },
      }),
    ),
    queryClient.prefetchQuery(orpc.task.capacityForDay.queryOptions({ input: { day: today.day } })),
    queryClient.prefetchQuery(orpc.session.running.queryOptions()),
    queryClient.prefetchQuery(orpc.session.totalForToday.queryOptions()),
    queryClient.prefetchQuery(orpc.area.list.queryOptions({ input: { includeArchived: false } })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TodayView />
    </HydrationBoundary>
  );
}
