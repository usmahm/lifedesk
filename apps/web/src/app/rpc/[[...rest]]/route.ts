import { appRouter, createContext } from "@lifedesk/api";
import { RPCHandler } from "@orpc/server/fetch";

import { getUserId } from "@/lib/auth/session";

/**
 * The only public surface of the API.
 *
 * Everything reachable here is reachable by anyone with devtools — that is
 * true of every RPC framework. What protects the data is the auth middleware
 * and the per-user filtering behind it, not the transport.
 * See docs/PLAN.md §6.2.
 */
const handler = new RPCHandler(appRouter);

async function handle(request: Request): Promise<Response> {
  const { response } = await handler.handle(request, {
    prefix: "/rpc",
    // The user id comes from the session cookie. It is never accepted from
    // the request body — that would be the whole vulnerability.
    context: createContext({ userId: await getUserId() }),
  });

  return response ?? new Response("Not found", { status: 404 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
