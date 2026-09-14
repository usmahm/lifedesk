import type { PrismaClient } from "@lifedesk/db";

import type { ProjectRepo } from "../types";
import { toProject } from "./map";

export function createPrismaProjectRepo(prisma: PrismaClient, now: () => Date): ProjectRepo {
  return {
    async list(userId, input) {
      const rows = await prisma.project.findMany({
        where: {
          userId,
          ...(input.includeArchived ? {} : { archivedAt: null }),
          // `null` is a real filter here — "projects with no area" — so this
          // checks for undefined rather than falsiness.
          ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      });
      return rows.map(toProject);
    },

    async findById(userId, id) {
      const row = await prisma.project.findFirst({ where: { id, userId } });
      return row ? toProject(row) : null;
    },

    async create(userId, input) {
      const { _max } = await prisma.project.aggregate({
        where: { userId },
        _max: { sortOrder: true },
      });

      const row = await prisma.project.create({
        data: {
          userId,
          areaId: input.areaId,
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          dueDate: input.dueDate,
          sortOrder: (_max.sortOrder ?? -1) + 1,
        },
      });
      return toProject(row);
    },

    async update(userId, input) {
      const { count } = await prisma.project.updateMany({
        where: { id: input.id, userId },
        data: {
          ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
          ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          updatedAt: now(),
        },
      });
      if (count === 0) return null;

      const row = await prisma.project.findFirst({ where: { id: input.id, userId } });
      return row ? toProject(row) : null;
    },

    async setArchived(userId, id, archived) {
      const { count } = await prisma.project.updateMany({
        where: { id, userId },
        data: { archivedAt: archived ? now() : null, updatedAt: now() },
      });
      if (count === 0) return null;

      const row = await prisma.project.findFirst({ where: { id, userId } });
      return row ? toProject(row) : null;
    },

    async remove(userId, id) {
      // Tasks and sessions detach rather than cascade — `onDelete: SetNull` on
      // both relations. Losing a project must not lose the work or the hours.
      const { count } = await prisma.project.deleteMany({ where: { id, userId } });
      return count > 0;
    },
  };
}
