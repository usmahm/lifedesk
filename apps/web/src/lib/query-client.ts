import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query owns all server state. Nothing is mirrored into useState or
 * a store — see .claude/rules/data-access.md.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that navigating between Today and Week doesn't refetch,
        // short enough that a second tab stays roughly in step.
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      dehydrate: {
        // Include pending queries so a server prefetch can stream.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  // A fresh client per request on the server; one shared client in the browser.
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
