import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { SettingsView } from "@/features/settings/components/SettingsView";
import { serverOrpc } from "@/lib/orpc/server";
import { makeQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const queryClient = makeQueryClient();
  const orpc = serverOrpc();

  await queryClient.prefetchQuery(orpc.settings.get.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsView />
    </HydrationBoundary>
  );
}
