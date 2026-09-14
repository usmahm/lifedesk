import type { TimeSession } from "@lifedesk/contracts";
import { elapsedSeconds } from "@lifedesk/core/time";

import type { SessionRepo } from "../types";
import { byStartedAtDesc, newId, ownedBy, paginate, type MemoryDb } from "./store";

export function createMemorySessionRepo(db: MemoryDb, now: () => Date): SessionRepo {
  function mine(userId: string): TimeSession[] {
    return [...db.sessions.values()].filter(ownedBy<TimeSession>(userId));
  }

  return {
    async running(userId) {
      return mine(userId).find((session) => session.endedAt === null) ?? null;
    },

    async list(userId, filters, page, range) {
      const matched = mine(userId)
        .filter((s) => (filters.taskId === undefined ? true : s.taskId === filters.taskId))
        .filter((s) => (filters.areaId === undefined ? true : s.areaId === filters.areaId))
        .filter((s) => (filters.projectId === undefined ? true : s.projectId === filters.projectId))
        .filter((s) =>
          filters.needsReview === undefined ? true : s.needsReview === filters.needsReview,
        )
        .filter((s) => (range ? s.startedAt >= range.start && s.startedAt < range.end : true))
        .sort(byStartedAtDesc);

      return paginate(matched, page);
    },

    async findById(userId, id) {
      const session = db.sessions.get(id);
      return session && session.userId === userId ? session : null;
    },

    async start(userId, payload) {
      const session: TimeSession = {
        id: newId(),
        userId,
        taskId: payload.taskId,
        projectId: payload.projectId,
        areaId: payload.areaId,
        startedAt: payload.startedAt,
        endedAt: null,
        durationSec: null,
        source: payload.source,
        note: null,
        needsReview: false,
        createdAt: now(),
        updatedAt: now(),
      };
      db.sessions.set(session.id, session);
      return session;
    },

    async stop(userId, id, endedAt, note, needsReview) {
      const existing = db.sessions.get(id);
      if (!existing || existing.userId !== userId) return null;

      const updated: TimeSession = {
        ...existing,
        endedAt,
        durationSec: elapsedSeconds(existing.startedAt, endedAt),
        note: note ?? existing.note,
        needsReview,
        updatedAt: now(),
      };
      db.sessions.set(updated.id, updated);
      return updated;
    },

    async create(userId, payload) {
      const session: TimeSession = {
        id: newId(),
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
        createdAt: now(),
        updatedAt: now(),
      };
      db.sessions.set(session.id, session);
      return session;
    },

    async update(userId, input) {
      const existing = db.sessions.get(input.id);
      if (!existing || existing.userId !== userId) return null;

      const startedAt = input.startedAt ?? existing.startedAt;
      const endedAt = input.endedAt !== undefined ? input.endedAt : existing.endedAt;

      const updated: TimeSession = {
        ...existing,
        taskId: input.taskId !== undefined ? (input.taskId ?? null) : existing.taskId,
        projectId: input.projectId !== undefined ? (input.projectId ?? null) : existing.projectId,
        areaId: input.areaId !== undefined ? (input.areaId ?? null) : existing.areaId,
        startedAt,
        endedAt,
        // Duration is always recomputed, never accepted from a client.
        durationSec: endedAt ? elapsedSeconds(startedAt, endedAt) : null,
        note: input.note !== undefined ? (input.note ?? null) : existing.note,
        needsReview: input.needsReview ?? existing.needsReview,
        updatedAt: now(),
      };
      db.sessions.set(updated.id, updated);
      return updated;
    },

    async remove(userId, id) {
      const existing = db.sessions.get(id);
      if (!existing || existing.userId !== userId) return false;

      db.sessions.delete(id);
      return true;
    },

    async totalSecondsInRange(userId, range) {
      return mine(userId)
        .filter((s) => s.startedAt >= range.start && s.startedAt < range.end)
        .reduce((sum, s) => sum + (s.durationSec ?? 0), 0);
    },
  };
}
