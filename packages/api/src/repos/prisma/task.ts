import type { PrismaClient } from "@lifedesk/db";
import type { CapacityInput } from "@lifedesk/core/capacity";

import type { TaskRepo } from "../types";
import { toTaskWithMeta, type TaskRowWithTags } from "./map";
import { cursorArgs, toPage } from "./page";

const WITH_TAGS = { tags: { select: { tagId: true } } } as const;

export function createPrismaTaskRepo(prisma: PrismaClient, now: () => Date): TaskRepo {
  /**
   * Tracked seconds for a batch of tasks, in one aggregate.
   *
   * Doing this per row would be an N+1 — fifty task rows meaning fifty SUM
   * queries. `groupBy` collapses it into one, and tasks with no sessions are
   * simply absent from the result rather than returning zero rows each.
   */
  async function trackedSecFor(taskIds: string[]): Promise<Map<string, number>> {
    if (taskIds.length === 0) return new Map();

    const groups = await prisma.timeSession.groupBy({
      by: ["taskId"],
      where: { taskId: { in: taskIds } },
      _sum: { durationSec: true },
    });

    const totals = new Map<string, number>();
    for (const group of groups) {
      if (group.taskId !== null) totals.set(group.taskId, group._sum.durationSec ?? 0);
    }
    return totals;
  }

  async function withMeta(rows: TaskRowWithTags[]) {
    const totals = await trackedSecFor(rows.map((row) => row.id));
    return rows.map((row) => toTaskWithMeta(row, totals.get(row.id) ?? 0));
  }

  return {
    async list(userId, filters, page) {
      const rows = await prisma.task.findMany({
        where: {
          userId,
          ...(filters.status ? { status: { in: filters.status } } : {}),
          // `null` is a meaningful filter — "no area" — so these test for
          // undefined rather than falsiness.
          ...(filters.areaId !== undefined ? { areaId: filters.areaId } : {}),
          ...(filters.projectId !== undefined ? { projectId: filters.projectId } : {}),
          ...(filters.scheduledFor ? { scheduledFor: filters.scheduledFor } : {}),
          // Calendar days are stored as YYYY-MM-DD text, which sorts
          // lexicographically == chronologically, so a string range is a real
          // date range. See the schema header.
          ...(filters.scheduledFrom || filters.scheduledTo
            ? {
                scheduledFor: {
                  ...(filters.scheduledFrom ? { gte: filters.scheduledFrom } : {}),
                  ...(filters.scheduledTo ? { lte: filters.scheduledTo } : {}),
                  not: null,
                },
              }
            : {}),
          ...(filters.unscheduled ? { scheduledFor: null } : {}),
          ...(filters.tagId ? { tags: { some: { tagId: filters.tagId } } } : {}),
          ...(filters.search
            ? { title: { contains: filters.search, mode: "insensitive" as const } }
            : {}),
        },
        include: WITH_TAGS,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        ...cursorArgs(page),
      });

      const { items, nextCursor } = toPage(rows, page);
      return { items: await withMeta(items), nextCursor };
    },

    async findById(userId, id) {
      const row = await prisma.task.findFirst({ where: { id, userId }, include: WITH_TAGS });
      if (!row) return null;

      const [task] = await withMeta([row]);
      return task ?? null;
    },

    async create(userId, input) {
      const { _max } = await prisma.task.aggregate({
        where: { userId },
        _max: { sortOrder: true },
      });

      const row = await prisma.task.create({
        data: {
          userId,
          projectId: input.projectId ?? null,
          areaId: input.areaId ?? null,
          parentTaskId: input.parentTaskId ?? null,
          title: input.title,
          notes: input.notes ?? null,
          priority: input.priority ?? "none",
          estimateMin: input.estimateMin ?? null,
          scheduledFor: input.scheduledFor ?? null,
          dueDate: input.dueDate ?? null,
          plannedStartMin: input.plannedStartMin ?? null,
          plannedEndMin: input.plannedEndMin ?? null,
          sortOrder: (_max.sortOrder ?? -1) + 1,
        },
        include: WITH_TAGS,
      });

      return toTaskWithMeta(row, 0);
    },

    async update(userId, input) {
      const existing = await prisma.task.findFirst({ where: { id: input.id, userId } });
      if (!existing) return null;

      const status = input.status ?? existing.status;
      // completedAt is derived from status, never set by the client, so the
      // two cannot disagree.
      const completedAt =
        status === "done"
          ? (existing.completedAt ?? now())
          : status === existing.status
            ? existing.completedAt
            : null;

      // A block only means something on a day. Clearing the day clears it,
      // rather than leaving an orphan the grid can never draw.
      const scheduledFor =
        input.scheduledFor !== undefined ? (input.scheduledFor ?? null) : existing.scheduledFor;
      const clearsBlock = scheduledFor === null;

      const row = await prisma.task.update({
        where: { id: existing.id },
        data: {
          ...(input.projectId !== undefined ? { projectId: input.projectId ?? null } : {}),
          ...(input.areaId !== undefined ? { areaId: input.areaId ?? null } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
          status,
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.estimateMin !== undefined ? { estimateMin: input.estimateMin ?? null } : {}),
          scheduledFor,
          ...(input.dueDate !== undefined ? { dueDate: input.dueDate ?? null } : {}),
          plannedStartMin: clearsBlock
            ? null
            : input.plannedStartMin !== undefined
              ? (input.plannedStartMin ?? null)
              : existing.plannedStartMin,
          plannedEndMin: clearsBlock
            ? null
            : input.plannedEndMin !== undefined
              ? (input.plannedEndMin ?? null)
              : existing.plannedEndMin,
          completedAt,
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          updatedAt: now(),
        },
        include: WITH_TAGS,
      });

      const [task] = await withMeta([row]);
      return task ?? null;
    },

    async remove(userId, id) {
      // Tag links cascade; sessions do not — deleting a task must not erase
      // the hours actually spent on it. They keep their denormalized area and
      // project, so reports stay correct.
      const { count } = await prisma.task.deleteMany({ where: { id, userId } });
      return count > 0;
    },

    async setTags(userId, id, tagIds) {
      const existing = await prisma.task.findFirst({ where: { id, userId } });
      if (!existing) return null;

      // Only the caller's own tags — otherwise a guessed id would attach
      // someone else's tag to your task.
      const owned = await prisma.tag.findMany({
        where: { userId, id: { in: tagIds } },
        select: { id: true },
      });

      await prisma.$transaction([
        prisma.taskTag.deleteMany({ where: { taskId: id } }),
        prisma.taskTag.createMany({
          data: owned.map((tag) => ({ taskId: id, tagId: tag.id })),
        }),
      ]);

      const row = await prisma.task.findFirst({ where: { id, userId }, include: WITH_TAGS });
      if (!row) return null;

      const [task] = await withMeta([row]);
      return task ?? null;
    },

    async capacityInputsForDay(userId, day): Promise<CapacityInput[]> {
      // A narrow indexed read on (userId, scheduledFor) — deliberately not
      // `list()`, because the capacity meter needs the whole day, unpaginated.
      const rows = await prisma.task.findMany({
        where: { userId, scheduledFor: day },
        select: { estimateMin: true, status: true },
      });
      return rows.map((row) => ({ estimateMin: row.estimateMin, status: row.status }));
    },
  };
}
