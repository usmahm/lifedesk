import "server-only";

import { DEV_USER, DEV_USER_ID } from "@lifedesk/api";
import { cookies } from "next/headers";

/**
 * Phase 1 session stub.
 *
 * Satisfies the same contract Better Auth will in Phase 2: something resolves
 * a user id from the request, and everything downstream sees `ctx.userId`.
 * The sign-in screens are built for real against this, so swapping in Better
 * Auth touches this file and nothing else.
 *
 * This is NOT authentication. It is a cookie holding a fixed dev user id, and
 * it must be gone before anyone other than the author uses the app.
 * See docs/PLAN.md §3.
 */

export const SESSION_COOKIE = "lifedesk_dev_session";

export async function getUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser() {
  const userId = await getUserId();
  return userId === DEV_USER_ID ? DEV_USER : null;
}

export async function isSignedIn(): Promise<boolean> {
  return (await getUserId()) !== null;
}
