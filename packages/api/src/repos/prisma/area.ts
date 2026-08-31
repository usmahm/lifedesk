import type { PrismaClient } from "@lifedesk/db";

import type { AreaRepo } from "../types";
import { toArea } from "./map";

/**
 * Every method takes `userId` first and puts it in the WHERE clause, so a row
 * belonging to someone else is indistinguishable from one that doesn't exist.
 * Writes use `updateMany` for the same reason: `update` by id alone would
 * happily write another user's row, and this way a miss returns 0 rather than
 * succeeding.
 */
export function createPrismaAreaRepo(prisma: PrismaClient, now: () => Date): AreaRepo {
  return {
    async list(userId, input) {
      const rows = await prisma.area.findMany({
        where: { userId, ...(input.includeArchived ? {} : { archivedAt: null }) },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      });
      return rows.map(toArea);
    },

    async findById(userId, id) {
      const row = await prisma.area.findFirst({ where: { id, userId } });
      return row ? toArea(row) : null;
    },

    async create(userId, input) {
      const { _max } = await prisma.area.aggregate({
        where: { userId },
        _max: { sortOrder: true },
      });

      const row = await prisma.area.create({
        data: {
          userId,
          name: input.name,
          color: input.color,
          icon: input.icon,
          sortOrder: (_max.sortOrder ?? -1) + 1,
        },
      });
      return toArea(row);
    },

    async update(userId, input) {
      const { count } = await prisma.area.updateMany({
        where: { id: input.id, userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          updatedAt: now(),
        },
      });
      if (count === 0) return null;

      const row = await prisma.area.findFirst({ where: { id: input.id, userId } });
      return row ? toArea(row) : null;
    },

    async setArchived(userId, id, archived) {
      // Soft delete — a stray click must not orphan months of tracked time.
      const { count } = await prisma.area.updateMany({
        where: { id, userId },
        data: { archivedAt: archived ? now() : null, updatedAt: now() },
      });
      if (count === 0) return null;

      const row = await prisma.area.findFirst({ where: { id, userId } });
      return row ? toArea(row) : null;
    },
  };
}
