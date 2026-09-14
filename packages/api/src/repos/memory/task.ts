import type { Task, TaskWithMeta, TimeSession } from "@lifedesk/contracts";
import type { CapacityInput } from "@lifedesk/core/capacity";

import type { TaskRepo } from "../types";
import {
  bySortOrderThenCreated,
  newId,
  nextSortOrder,
  ownedBy,
  paginate,
  type MemoryDb,
} from "./store";

export function createMemoryTaskRepo(db: MemoryDb, now: () => Date): TaskRepo {
  function mine(userId: string): Task[] {
    return [...db.tasks.values()].filter(ownedBy<Task>(userId));
  }

  function tagIdsFor(taskId: string): string[] {
    return db.taskTags.filter((row) => row.taskId === taskId).map((row) => row.tagId);
  }

  /** Sum of every session ever tracked against this task. */
  function trackedSecFor(taskId: string): number {
    return [...db.sessions.values()]
      .filter((session: TimeSession) => session.taskId === taskId)
      .reduce((sum, session) => sum + (session.durationSec ?? 0), 0);
  }

  function withMeta(task: Task): TaskWithMeta {
    return { ...task, trackedSec: trackedSecFor(task.id), tagIds: tagIdsFor(task.id) };
  }

  return {
    async list(userId, filters, page) {
      const matched = mine(userId)
        .filter((task) => (filters.status ? filters.status.includes(task.status) : true))
        .filter((task) => (filters.areaId === undefined ? true : task.areaId === filters.areaId))
        .filter((task) =>
          filters.projectId === undefined ? true : task.projectId === filters.projectId,
        )
        .filter((task) =>
          filters.scheduledFor ? task.scheduledFor === filters.scheduledFor : true,
        )
        .filter((task) =>
          filters.scheduledFrom
            ? task.scheduledFor !== null && task.scheduledFor >= filters.scheduledFrom
            : true,
        )
        .filter((task) =>
          filters.scheduledTo
            ? task.scheduledFor !== null && task.scheduledFor <= filters.scheduledTo
            : true,
        )
        .filter((task) => (filters.unscheduled ? task.scheduledFor === null : true))
        .filter((task) =>
          filters.tagId
            ? db.taskTags.some((r) => r.taskId === task.id && r.tagId === filters.tagId)
            : true,
        )
        .filter((task) =>
          filters.search ? task.title.toLowerCase().includes(filters.search.toLowerCase()) : true,
        )
        .sort(bySortOrderThenCreated);

      const { items, nextCursor } = paginate(matched, page);
      return { items: items.map(withMeta), nextCursor };
    },

    async findById(userId, id) {
      const task = db.tasks.get(id);
      return task && task.userId === userId ? withMeta(task) : null;
    },

    async create(userId, input) {
      const at = now();
      const task: Task = {
        id: newId(),
        userId,
        projectId: input.projectId ?? null,
        areaId: input.areaId ?? null,
        parentTaskId: input.parentTaskId ?? null,
        title: input.title,
        notes: input.notes ?? null,
        status: "todo",
        priority: input.priority ?? "none",
        estimateMin: input.estimateMin ?? null,
        scheduledFor: input.scheduledFor ?? null,
        dueDate: input.dueDate ?? null,
        plannedStartMin: input.plannedStartMin ?? null,
        plannedEndMin: input.plannedEndMin ?? null,
        completedAt: null,
        sortOrder: nextSortOrder(mine(userId)),
        createdAt: at,
        updatedAt: at,
      };
      db.tasks.set(task.id, task);
      return withMeta(task);
    },

    async update(userId, input) {
      const existing = db.tasks.get(input.id);
      if (!existing || existing.userId !== userId) return null;

      const status = input.status ?? existing.status;
      // completedAt is derived from status, never set by the client — so the
      // two can't disagree.
      const completedAt =
        status === "done"
          ? (existing.completedAt ?? now())
          : status === existing.status
            ? existing.completedAt
            : null;

      // A block only means something on a day. Clearing the day clears it,
      // rather than leaving an orphan the grid can never show.
      const scheduledFor =
        input.scheduledFor !== undefined ? (input.scheduledFor ?? null) : existing.scheduledFor;

      const clearsBlock = scheduledFor === null;

      const updated: Task = {
        ...existing,
        projectId: input.projectId !== undefined ? (input.projectId ?? null) : existing.projectId,
        areaId: input.areaId !== undefined ? (input.areaId ?? null) : existing.areaId,
        title: input.title ?? existing.title,
        notes: input.notes !== undefined ? (input.notes ?? null) : existing.notes,
        status,
        priority: input.priority ?? existing.priority,
        estimateMin:
          input.estimateMin !== undefined ? (input.estimateMin ?? null) : existing.estimateMin,
        scheduledFor,
        dueDate: input.dueDate !== undefined ? (input.dueDate ?? null) : existing.dueDate,
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
        sortOrder: input.sortOrder ?? existing.sortOrder,
        updatedAt: now(),
      };
      db.tasks.set(updated.id, updated);
      return withMeta(updated);
    },

    async remove(userId, id) {
      const existing = db.tasks.get(id);
      if (!existing || existing.userId !== userId) return false;

      db.tasks.delete(id);
      db.taskTags = db.taskTags.filter((row) => row.taskId !== id);
      // Sessions survive deliberately — deleting a task must not erase the
      // hours you actually spent on it. They keep their denormalized area
      // and project, so reports stay correct.
      return true;
    },

    async setTags(userId, id, tagIds) {
      const existing = db.tasks.get(id);
      if (!existing || existing.userId !== userId) return null;

      const ownedTagIds = tagIds.filter((tagId) => db.tags.get(tagId)?.userId === userId);

      db.taskTags = db.taskTags.filter((row) => row.taskId !== id);
      db.taskTags.push(...ownedTagIds.map((tagId) => ({ taskId: id, tagId })));

      return withMeta(existing);
    },

    async capacityInputsForDay(userId, day): Promise<CapacityInput[]> {
      return mine(userId)
        .filter((task) => task.scheduledFor === day)
        .map((task) => ({ estimateMin: task.estimateMin, status: task.status }));
    },
  };
}
