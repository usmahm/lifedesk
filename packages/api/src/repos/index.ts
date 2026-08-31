import { createMemoryRepos } from "./memory/index";
import type { Repos } from "./types";

export * from "./types";
export { DEV_USER, DEV_USER_ID } from "./memory/index";

/**
 * The one place storage is chosen.
 *
 * Phase 2 adds a Prisma branch here and flips the default. Nothing above this
 * line — no procedure, no hook, no component — should need to change.
 * See docs/PLAN.md §3.
 */

let singleton: Repos | null = null;

export function getRepos(now: () => Date): Repos {
  // Module-level so mutations survive across requests in dev. Next's dev
  // server re-evaluates modules on change, which resets the fixtures — that
  // is acceptable for Phase 1 and goes away with the real database.
  singleton ??= createMemoryRepos({ now });
  return singleton;
}

/** Test seam: build an isolated set of repositories with no shared state. */
export function createTestRepos(options: { now: () => Date; seed?: boolean }): Repos {
  return createMemoryRepos(options);
}
