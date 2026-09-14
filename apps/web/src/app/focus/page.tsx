import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { FocusView } from "@/features/focus/components/FocusView";
import { serverOrpc } from "@/lib/orpc/server";
import { makeQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Focus" };

/**
 * Prefetched so the first paint already has the clock.
 *
 * Only the running session and settings: the task is not known until the
 * session resolves, so fetching it here would mean a round trip to learn the
 * id and another to use it.
 */
export default async function FocusPage() {
  const queryClient = makeQueryClient();
  const orpc = serverOrpc();

  await Promise.all([
    queryClient.prefetchQuery(orpc.session.running.queryOptions()),
    queryClient.prefetchQuery(orpc.settings.get.queryOptions()),
    queryClient.prefetchQuery(orpc.settings.today.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FocusView />
    </HydrationBoundary>
  );
}
