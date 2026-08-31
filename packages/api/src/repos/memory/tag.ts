import type { Tag } from "@lifedesk/contracts";

import type { TagRepo } from "../types";
import { newId, ownedBy, type MemoryDb } from "./store";

export function createMemoryTagRepo(db: MemoryDb, now: () => Date): TagRepo {
  return {
    async list(userId) {
      return [...db.tags.values()]
        .filter(ownedBy<Tag>(userId))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async findById(userId, id) {
      const tag = db.tags.get(id);
      return tag && tag.userId === userId ? tag : null;
    },

    async create(userId, input) {
      const tag: Tag = {
        id: newId(),
        userId,
        name: input.name,
        color: input.color,
        createdAt: now(),
      };
      db.tags.set(tag.id, tag);
      return tag;
    },

    async update(userId, input) {
      const existing = db.tags.get(input.id);
      if (!existing || existing.userId !== userId) return null;

      const updated: Tag = {
        ...existing,
        name: input.name ?? existing.name,
        color: input.color ?? existing.color,
      };
      db.tags.set(updated.id, updated);
      return updated;
    },

    async remove(userId, id) {
      const existing = db.tags.get(id);
      if (!existing || existing.userId !== userId) return false;

      db.tags.delete(id);
      db.taskTags = db.taskTags.filter((row) => row.tagId !== id);
      return true;
    },
  };
}
