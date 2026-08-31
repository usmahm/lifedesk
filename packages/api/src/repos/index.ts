import { createMemoryRepos } from "./memory/index";
import { createPrismaRepos } from "./prisma/index";
import type { Repos } from "./types";

export * from "./types";
export { DEV_USER, DEV_USER_ID } from "./memory/index";

/**
 * The one place storage is chosen.
 *
 * Nothing above this line — no procedure, no hook, no component — knows which
 * implementation it is talking to. See docs/PLAN.md §3.
 *
 * Prisma is the default. Setting `LIFEDESK_REPOS=memory` falls back to the
 * in-memory maps, which is how the app runs with no database at all: useful
 * for a demo on a plane, and for bisecting whether a bug is in the UI or the
 * queries underneath it.
 */

let singleton: Repos | null = null;

function useMemoryRepos(): boolean {
  return process.env.LIFEDESK_REPOS === "memory" || !process.env.DATABASE_URL;
}

export function getRepos(now: () => Date): Repos {
  singleton ??= useMemoryRepos() ? createMemoryRepos({ now }) : createPrismaRepos({ now });
  return singleton;
}

/** Test seam: build an isolated set of repositories with no shared state. */
export function createTestRepos(options: { now: () => Date; seed?: boolean }): Repos {
  return createMemoryRepos(options);
}

/**
 * The same seam, against the real database.
 *
 * The contract tests run the whole suite through both this and
 * `createTestRepos`, which is what proves the two are interchangeable — the
 * measure of whether the swap actually held.
 */
export function createPrismaTestRepos(options: { now: () => Date }): Repos {
  return createPrismaRepos(options);
}
