import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { SessionsView } from "@/features/sessions/components/SessionsView";
import { serverOrpc } from "@/lib/orpc/server";
import { makeQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const queryClient = makeQueryClient();
  const orpc = serverOrpc();

  await Promise.all([
    queryClient.prefetchQuery(
      orpc.session.list.queryOptions({ input: { filters: {}, page: { limit: 60 } } }),
    ),
    queryClient.prefetchQuery(
      orpc.task.list.queryOptions({ input: { filters: {}, page: { limit: 200 } } }),
    ),
    queryClient.prefetchQuery(orpc.settings.today.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SessionsView />
    </HydrationBoundary>
  );
}
