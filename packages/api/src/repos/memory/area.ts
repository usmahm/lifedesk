import type { Area } from "@lifedesk/contracts";

import type { AreaRepo } from "../types";
import { bySortOrderThenCreated, newId, nextSortOrder, ownedBy, type MemoryDb } from "./store";

export function createMemoryAreaRepo(db: MemoryDb, now: () => Date): AreaRepo {
  function mine(userId: string): Area[] {
    return [...db.areas.values()].filter(ownedBy<Area>(userId));
  }

  return {
    async list(userId, input) {
      return mine(userId)
        .filter((area) => input.includeArchived || area.archivedAt === null)
        .sort(bySortOrderThenCreated);
    },

    async findById(userId, id) {
      const area = db.areas.get(id);
      // Ownership is part of the lookup, not a check after it.
      return area && area.userId === userId ? area : null;
    },

    async create(userId, input) {
      const at = now();
      const area: Area = {
        id: newId(),
        userId,
        name: input.name,
        color: input.color,
        icon: input.icon,
        sortOrder: nextSortOrder(mine(userId)),
        archivedAt: null,
        createdAt: at,
        updatedAt: at,
      };
      db.areas.set(area.id, area);
      return area;
    },

    async update(userId, input) {
      const existing = db.areas.get(input.id);
      if (!existing || existing.userId !== userId) return null;

      const updated: Area = {
        ...existing,
        name: input.name ?? existing.name,
        color: input.color ?? existing.color,
        icon: input.icon !== undefined ? input.icon : existing.icon,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        updatedAt: now(),
      };
      db.areas.set(updated.id, updated);
      return updated;
    },

    async setArchived(userId, id, archived) {
      const existing = db.areas.get(id);
      if (!existing || existing.userId !== userId) return null;

      // Soft delete — a stray click must not orphan months of tracked time.
      const updated: Area = {
        ...existing,
        archivedAt: archived ? now() : null,
        updatedAt: now(),
      };
      db.areas.set(updated.id, updated);
      return updated;
    },
  };
}
