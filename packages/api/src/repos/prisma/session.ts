import type { PrismaClient } from "@lifedesk/db";
import { elapsedSeconds } from "@lifedesk/core/time";

import type { SessionRepo } from "../types";
import { toSession } from "./map";
import { cursorArgs, toPage } from "./page";

export function createPrismaSessionRepo(prisma: PrismaClient, now: () => Date): SessionRepo {
  return {
    async running(userId) {
      // At most one can match — the partial unique index on
      // (userId) WHERE endedAt IS NULL makes two impossible.
      const row = await prisma.timeSession.findFirst({ where: { userId, endedAt: null } });
      return row ? toSession(row) : null;
    },

    async list(userId, filters, page, range) {
      const rows = await prisma.timeSession.findMany({
        where: {
          userId,
          ...(filters.taskId !== undefined ? { taskId: filters.taskId } : {}),
          ...(filters.areaId !== undefined ? { areaId: filters.areaId } : {}),
          ...(filters.projectId !== undefined ? { projectId: filters.projectId } : {}),
          ...(filters.needsReview !== undefined ? { needsReview: filters.needsReview } : {}),
          // Half-open, matching the memory repo: a session starting exactly at
          // midnight belongs to the new day, not both.
          ...(range ? { startedAt: { gte: range.start, lt: range.end } } : {}),
        },
        orderBy: [{ startedAt: "desc" }, { id: "asc" }],
        ...cursorArgs(page),
      });

      const { items, nextCursor } = toPage(rows, page);
      return { items: items.map(toSession), nextCursor };
    },

    async findById(userId, id) {
      const row = await prisma.timeSession.findFirst({ where: { id, userId } });
      return row ? toSession(row) : null;
    },

    async start(userId, payload) {
      const row = await prisma.timeSession.create({
        data: {
          userId,
          taskId: payload.taskId,
          projectId: payload.projectId,
          areaId: payload.areaId,
          startedAt: payload.startedAt,
          source: payload.source,
        },
      });
      return toSession(row);
    },

    async stop(userId, id, endedAt, note, needsReview) {
      const existing = await prisma.timeSession.findFirst({ where: { id, userId } });
      if (!existing) return null;

      const row = await prisma.timeSession.update({
        where: { id: existing.id },
        data: {
          endedAt,
          // Always recomputed from the endpoints, never accepted from a client.
          durationSec: elapsedSeconds(existing.startedAt, endedAt),
          note: note ?? existing.note,
          needsReview,
          updatedAt: now(),
        },
      });
      return toSession(row);
    },

    async create(userId, payload) {
      const row = await prisma.timeSession.create({
        data: {
          userId,
          taskId: payload.taskId,
          projectId: payload.projectId,
          areaId: payload.areaId,
          startedAt: payload.startedAt,
          endedAt: payload.endedAt,
          durationSec: elapsedSeconds(payload.startedAt, payload.endedAt),
          source: payload.source,
          note: payload.note,
          needsReview: payload.needsReview,
        },
      });
      return toSession(row);
    },

    async update(userId, input) {
      const existing = await prisma.timeSession.findFirst({ where: { id: input.id, userId } });
      if (!existing) return null;

      const startedAt = input.startedAt ?? existing.startedAt;
      const endedAt = input.endedAt !== undefined ? input.endedAt : existing.endedAt;

      const row = await prisma.timeSession.update({
        where: { id: existing.id },
        data: {
          ...(input.taskId !== undefined ? { taskId: input.taskId ?? null } : {}),
          ...(input.projectId !== undefined ? { projectId: input.projectId ?? null } : {}),
          ...(input.areaId !== undefined ? { areaId: input.areaId ?? null } : {}),
          startedAt,
          endedAt,
          durationSec: endedAt ? elapsedSeconds(startedAt, endedAt) : null,
          ...(input.note !== undefined ? { note: input.note ?? null } : {}),
          ...(input.needsReview !== undefined ? { needsReview: input.needsReview } : {}),
          updatedAt: now(),
        },
      });
      return toSession(row);
    },

    async remove(userId, id) {
      const { count } = await prisma.timeSession.deleteMany({ where: { id, userId } });
      return count > 0;
    },

    async totalSecondsInRange(userId, range) {
      const { _sum } = await prisma.timeSession.aggregate({
        where: { userId, startedAt: { gte: range.start, lt: range.end } },
        _sum: { durationSec: true },
      });
      return _sum.durationSec ?? 0;
    },
  };
}
