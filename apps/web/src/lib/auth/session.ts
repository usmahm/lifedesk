import "server-only";

import { headers } from "next/headers";

import { auth } from "./server";

/**
 * Reading the current session on the server.
 *
 * The same three functions the Phase 1 stub exposed, with the same signatures —
 * `page.tsx`, the app layout, the RPC route handler and the RSC oRPC client all
 * call these and none of them changed when real auth landed. That was the point
 * of the stub satisfying this contract from day one.
 */

export async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function isSignedIn(): Promise<boolean> {
  return (await getUserId()) !== null;
}
