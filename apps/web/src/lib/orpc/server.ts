import "server-only";

import { appRouter, createContext } from "@lifedesk/api";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { getUserId } from "@/lib/auth/session";

/**
 * The server-side client, for React Server Components.
 *
 * Calls the router in-process with no HTTP round trip, so a page load never
 * touches the public endpoint. Context is resolved per request, which is why
 * it's a function rather than a shared instance.
 */
export function serverClient() {
  return createRouterClient(appRouter, {
    context: async () => createContext({ userId: await getUserId() }),
  });
}

/** Prefetch helpers for hydrating the client cache from a server component. */
export function serverOrpc() {
  return createTanstackQueryUtils(serverClient());
}
