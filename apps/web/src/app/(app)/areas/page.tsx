import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { AreasView } from "@/features/areas/components/AreasView";
import { serverOrpc } from "@/lib/orpc/server";
import { makeQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Areas" };

export default async function AreasPage() {
  const queryClient = makeQueryClient();
  const orpc = serverOrpc();

  await Promise.all([
    queryClient.prefetchQuery(orpc.area.list.queryOptions({ input: { includeArchived: false } })),
    queryClient.prefetchQuery(
      orpc.project.list.queryOptions({ input: { includeArchived: false } }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AreasView />
    </HydrationBoundary>
  );
}
