import type { Project } from "@lifedesk/contracts";

import type { ProjectRepo } from "../types";
import { bySortOrderThenCreated, newId, nextSortOrder, ownedBy, type MemoryDb } from "./store";

export function createMemoryProjectRepo(db: MemoryDb, now: () => Date): ProjectRepo {
  function mine(userId: string): Project[] {
    return [...db.projects.values()].filter(ownedBy<Project>(userId));
  }

  return {
    async list(userId, input) {
      return mine(userId)
        .filter((project) => input.includeArchived || project.archivedAt === null)
        .filter((project) => (input.areaId === undefined ? true : project.areaId === input.areaId))
        .filter((project) => (input.status ? project.status === input.status : true))
        .sort(bySortOrderThenCreated);
    },

    async findById(userId, id) {
      const project = db.projects.get(id);
      return project && project.userId === userId ? project : null;
    },

    async create(userId, input) {
      const at = now();
      const project: Project = {
        id: newId(),
        userId,
        areaId: input.areaId,
        name: input.name,
        description: input.description,
        status: "active",
        startDate: input.startDate,
        dueDate: input.dueDate,
        sortOrder: nextSortOrder(mine(userId)),
        archivedAt: null,
        createdAt: at,
        updatedAt: at,
      };
      db.projects.set(project.id, project);
      return project;
    },

    async update(userId, input) {
      const existing = db.projects.get(input.id);
      if (!existing || existing.userId !== userId) return null;

      const updated: Project = {
        ...existing,
        areaId: input.areaId !== undefined ? input.areaId : existing.areaId,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        status: input.status ?? existing.status,
        startDate: input.startDate !== undefined ? input.startDate : existing.startDate,
        dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        updatedAt: now(),
      };
      db.projects.set(updated.id, updated);
      return updated;
    },

    async setArchived(userId, id, archived) {
      const existing = db.projects.get(id);
      if (!existing || existing.userId !== userId) return null;

      const updated: Project = {
        ...existing,
        archivedAt: archived ? now() : null,
        updatedAt: now(),
      };
      db.projects.set(updated.id, updated);
      return updated;
    },
  };
}
