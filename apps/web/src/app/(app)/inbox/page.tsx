import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { InboxView } from "@/features/inbox/components/InboxView";
import { serverOrpc } from "@/lib/orpc/server";
import { makeQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const queryClient = makeQueryClient();
  const orpc = serverOrpc();

  await Promise.all([
    queryClient.prefetchQuery(
      orpc.task.list.queryOptions({
        input: { filters: { unscheduled: true, status: ["todo", "doing"] }, page: {} },
      }),
    ),
    queryClient.prefetchQuery(orpc.settings.today.queryOptions()),
    queryClient.prefetchQuery(orpc.area.list.queryOptions({ input: { includeArchived: false } })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InboxView />
    </HydrationBoundary>
  );
}
