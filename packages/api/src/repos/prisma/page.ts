import type { Page, ResolvedCursorPage } from "@lifedesk/contracts";

/**
 * Keyset pagination, matching the memory implementation exactly.
 *
 * The cursor is the last id seen. Prisma turns that into `WHERE (sort keys) >
 * (cursor's keys)` against the current `orderBy`, which is why every paginated
 * query here must order by something ending in `id` — otherwise ties make rows
 * repeat or vanish between pages.
 */
export function cursorArgs(page: ResolvedCursorPage): {
  take: number;
  skip?: number;
  cursor?: { id: string };
} {
  return {
    // One extra row, purely to learn whether another page exists. Cheaper than
    // a second COUNT over the same filter.
    take: page.limit + 1,
    ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
  };
}

/** Trims the probe row and derives `nextCursor` from what is left. */
export function toPage<T extends { id: string }>(rows: T[], page: ResolvedCursorPage): Page<T> {
  const hasMore = rows.length > page.limit;
  const items = hasMore ? rows.slice(0, page.limit) : rows;

  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}
