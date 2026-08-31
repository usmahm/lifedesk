import "server-only";

import { createAuth } from "@lifedesk/api";
import { nextCookies } from "better-auth/next-js";

/**
 * The Better Auth instance for this app.
 *
 * `packages/api` builds it but deliberately does not choose plugins, so it
 * stays free of anything Next-specific. `nextCookies()` is added here because
 * it reaches into `next/headers` to forward Set-Cookie out of server actions —
 * without it, signing in would succeed and then not persist.
 *
 * It must be last in the list; the plugin warns loudly if it isn't.
 */
export const auth = createAuth({ plugins: [nextCookies()] });
