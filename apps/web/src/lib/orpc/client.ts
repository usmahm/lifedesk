import type { AppRouter } from "@lifedesk/api";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

/**
 * The browser client.
 *
 * `AppRouter` is a type-only import, so no server code reaches the bundle.
 * See .claude/rules/data-access.md.
 */

function baseUrl(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/rpc`;
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/rpc`;
}

const link = new RPCLink({
  url: baseUrl,
  // Send the session cookie with every call.
  fetch: (request, init) => globalThis.fetch(request, { ...init, credentials: "include" }),
});

export const client: RouterClient<AppRouter> = createORPCClient(link);

/**
 * Query and mutation helpers.
 *
 * Query keys come from here, never hand-written strings — that's what keeps
 * invalidation honest.
 */
export const orpc = createTanstackQueryUtils(client);
