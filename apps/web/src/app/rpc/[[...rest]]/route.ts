import { appRouter, createContext } from "@lifedesk/api";
import { ORPCError } from "@orpc/server";
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
const handler = new RPCHandler(appRouter, {
  interceptors: [
    async ({ next, request }) => {
      try {
        return await next();
      } catch (error) {
        logUnexpected(error, request);
        throw error;
      }
    },
  ],
});

/**
 * Production diagnosis, via Vercel's runtime logs — there is no Sentry.
 *
 * Only genuinely unexpected failures are logged. NOT_FOUND and UNAUTHORIZED
 * are the system working correctly and happen constantly; logging them buries
 * the one line that matters under noise.
 *
 * The request body is deliberately never logged: it carries task titles and
 * notes, which are the user's private content. oRPC makes that easy to honour
 * — `body` is a lazy function here, so not calling it means it is never even
 * parsed, let alone written to a log.
 */
function logUnexpected(error: unknown, request: { url: URL; method: string }): void {
  // An ORPCError is a deliberate, handled outcome — a thrown one is the
  // procedure saying "no", not the server falling over.
  if (error instanceof ORPCError) return;

  console.error("[rpc] unhandled error", {
    path: request.url.pathname,
    method: request.method,
    error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
  });
}

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
