import { ORPCError, os } from "@orpc/server";

import type { AuthedContext, Context } from "./context";

/**
 * Procedure builders.
 *
 * `protectedProcedure` proves WHO is calling. It says nothing about WHAT they
 * own — every handler must still scope its reads and writes to `context.userId`,
 * which the repository signatures enforce by taking it as the first argument.
 * See .claude/rules/data-access.md.
 */

const base = os.$context<Context>();

const requireUser = base.middleware(({ context, next }) => {
  if (!context.userId) {
    throw new ORPCError("UNAUTHORIZED", { message: "Sign in to continue." });
  }

  return next({ context: { ...context, userId: context.userId } satisfies AuthedContext });
});

/** Sign-in, sign-up, health. Everything else is protected. */
export const publicProcedure = base;

export const protectedProcedure = base.use(requireUser);

/**
 * A row that belongs to someone else must read as absent.
 *
 * Returning FORBIDDEN would confirm the record exists, which is itself a leak.
 */
export function notFound(what: string): never {
  throw new ORPCError("NOT_FOUND", { message: `${what} not found.` });
}
