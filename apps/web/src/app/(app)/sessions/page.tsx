import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { SessionsView } from "@/features/sessions/components/SessionsView";
import { serverOrpc } from "@/lib/orpc/server";
import { makeQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const queryClient = makeQueryClient();
  const orpc = serverOrpc();

  // The view opens on today, so prefetch exactly that day — the input must
  // match the client hook or the cache misses and it refetches anyway.
  const today = await queryClient.fetchQuery(orpc.settings.today.queryOptions());

  await Promise.all([
    queryClient.prefetchQuery(
      orpc.session.list.queryOptions({
        input: { filters: { from: today.day, to: today.day }, page: { limit: 100 } },
      }),
    ),
    queryClient.prefetchQuery(
      orpc.session.list.queryOptions({
        input: { filters: { needsReview: true }, page: { limit: 20 } },
      }),
    ),
    queryClient.prefetchQuery(
      orpc.task.list.queryOptions({ input: { filters: {}, page: { limit: 200 } } }),
    ),
    queryClient.prefetchQuery(orpc.area.list.queryOptions({ input: { includeArchived: true } })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SessionsView />
    </HydrationBoundary>
  );
}
