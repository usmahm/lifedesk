import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

/**
 * Better Auth's own endpoints — sign-in, sign-up, sign-out, session.
 *
 * Separate from `/rpc`, which carries application procedures. Both are public
 * by definition; what protects them is that every procedure resolves
 * `ctx.userId` from the session here and filters by it. See docs/PLAN.md §6.2.
 */
export const { GET, POST } = toNextJsHandler(auth);
