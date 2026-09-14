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

    async remove(userId, id) {
      const existing = db.projects.get(id);
      if (!existing || existing.userId !== userId) return false;

      db.projects.delete(id);

      // Mirrors `onDelete: SetNull` in the schema. Deleting a project must not
      // delete the work inside it, nor erase hours already logged against it —
      // and if this diverged from Prisma, the swap would quietly change what
      // "delete" means.
      //
      // Prisma needs none of this: there it is one `deleteMany` and Postgres
      // detaches the rows through the foreign key. Do not copy this shape into
      // that implementation.
      //
      // The `userId` guard is not redundant even though ids are uuids. Every
      // method here takes the owner first precisely so that touching another
      // user's rows is impossible to write by accident, and a loop over the
      // whole map is the one place that rule is easy to lose.
      detach(db.tasks, userId, id, (task) => ({ ...task, projectId: null }));
      detach(db.sessions, userId, id, (session) => ({ ...session, projectId: null }));

      return true;
    },
  };
}

/**
 * Null out `projectId` on every row of `rows` that the owner holds against it.
 *
 * A scan, which is fine here and nowhere else: this map is a test double and
 * the offline fallback, holding fixture data. A secondary index would have to
 * be maintained by every create, update and delete — a whole class of drift
 * bug bought in exchange for speed that is unmeasurable over a few hundred
 * entries. Production does not run this path at all.
 */
function detach<T extends { userId: string; projectId: string | null }>(
  rows: Map<string, T>,
  userId: string,
  projectId: string,
  clear: (row: T) => T,
): void {
  for (const [key, row] of rows) {
    if (row.userId === userId && row.projectId === projectId) rows.set(key, clear(row));
  }
}
