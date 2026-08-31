import type { Clock } from "./clock";
import { systemClock } from "./clock";
import { getRepos } from "./repos/index";
import type { Repos } from "./repos/types";

/**
 * Request context.
 *
 * `userId` is nullable here and non-null after `protectedProcedure` — that is
 * the entire point of the split. No procedure gets a repository without a user
 * attached. See .claude/rules/data-access.md.
 */
export type Context = {
  userId: string | null;
  repos: Repos;
  now: Clock;
};

/** Context after the auth middleware has run. */
export type AuthedContext = Omit<Context, "userId"> & { userId: string };

export type CreateContextOptions = {
  /** Resolved from the session by the caller — never from procedure input. */
  userId: string | null;
  now?: Clock;
};

export function createContext(options: CreateContextOptions): Context {
  const now = options.now ?? systemClock;

  return {
    userId: options.userId,
    repos: getRepos(now),
    now,
  };
}
