import type { PrismaClient } from "@lifedesk/db";

import type { TagRepo } from "../types";
import { toTag } from "./map";

export function createPrismaTagRepo(prisma: PrismaClient): TagRepo {
  return {
    async list(userId) {
      const rows = await prisma.tag.findMany({
        where: { userId },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });
      return rows.map(toTag);
    },

    async findById(userId, id) {
      const row = await prisma.tag.findFirst({ where: { id, userId } });
      return row ? toTag(row) : null;
    },

    async create(userId, input) {
      const row = await prisma.tag.create({
        data: { userId, name: input.name, color: input.color },
      });
      return toTag(row);
    },

    async update(userId, input) {
      const { count } = await prisma.tag.updateMany({
        where: { id: input.id, userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
        },
      });
      if (count === 0) return null;

      const row = await prisma.tag.findFirst({ where: { id: input.id, userId } });
      return row ? toTag(row) : null;
    },

    async remove(userId, id) {
      // Task links cascade from the schema.
      const { count } = await prisma.tag.deleteMany({ where: { id, userId } });
      return count > 0;
    },
  };
}
