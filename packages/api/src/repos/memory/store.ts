import type {
  Area,
  Project,
  ResolvedCursorPage,
  Tag,
  Task,
  TimeSession,
  UserSettings,
} from "@lifedesk/contracts";

/**
 * The Phase 1 in-memory database.
 *
 * Module-level maps, so mutations survive navigation and the demo feels like
 * the product rather than a clickable mockup. State resets when the dev server
 * restarts, which is fine — Phase 2 replaces this wholesale.
 */

export type TaskTagRow = { taskId: string; tagId: string };

export type MemoryDb = {
  areas: Map<string, Area>;
  projects: Map<string, Project>;
  tasks: Map<string, Task>;
  tags: Map<string, Tag>;
  taskTags: TaskTagRow[];
  sessions: Map<string, TimeSession>;
  settings: Map<string, UserSettings>;
};

export function createDb(): MemoryDb {
  return {
    areas: new Map(),
    projects: new Map(),
    tasks: new Map(),
    tags: new Map(),
    taskTags: [],
    sessions: new Map(),
    settings: new Map(),
  };
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Owned-by filter, applied in every read. Mirrors the real WHERE clause. */
export function ownedBy<T extends { userId: string }>(userId: string) {
  return (row: T): boolean => row.userId === userId;
}

/**
 * Keyset-style pagination over a pre-sorted array.
 *
 * The cursor is the last id seen, which is what the Prisma implementation will
 * use too — so the memory repo can't accidentally support something Postgres
 * can't do cheaply.
 */
export function paginate<T extends { id: string }>(
  sorted: readonly T[],
  page: ResolvedCursorPage,
): { items: T[]; nextCursor: string | null } {
  const start = page.cursor ? sorted.findIndex((row) => row.id === page.cursor) + 1 : 0;

  const items = sorted.slice(start, start + page.limit);
  const hasMore = start + page.limit < sorted.length;

  return {
    items,
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  };
}

/** Stable ordering — ties broken by id so pagination never repeats or skips. */
export function bySortOrderThenCreated<
  T extends { sortOrder: number; createdAt: Date; id: string },
>(a: T, b: T): number {
  return (
    a.sortOrder - b.sortOrder ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}

export function byStartedAtDesc<T extends { startedAt: Date; id: string }>(a: T, b: T): number {
  return b.startedAt.getTime() - a.startedAt.getTime() || a.id.localeCompare(b.id);
}

/** Next sort position within a sibling group. */
export function nextSortOrder(rows: readonly { sortOrder: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}
