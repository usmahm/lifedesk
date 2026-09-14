import {
  createProjectInput,
  idSchema,
  listProjectsInput,
  updateProjectInput,
} from "@lifedesk/contracts";
import { z } from "zod";

import { notFound, protectedProcedure } from "../orpc";

export const projectRouter = {
  list: protectedProcedure
    .input(listProjectsInput)
    .handler(({ input, context }) => context.repos.project.list(context.userId, input)),

  get: protectedProcedure
    .input(z.object({ id: idSchema }))
    .handler(async ({ input, context }) => {
      const project = await context.repos.project.findById(context.userId, input.id);
      return project ?? notFound("Project");
    }),

  create: protectedProcedure.input(createProjectInput).handler(async ({ input, context }) => {
    // Reject an area that isn't the caller's, rather than silently creating an
    // orphan pointing at someone else's row.
    if (input.areaId) {
      const area = await context.repos.area.findById(context.userId, input.areaId);
      if (!area) notFound("Area");
    }

    return context.repos.project.create(context.userId, input);
  }),

  update: protectedProcedure.input(updateProjectInput).handler(async ({ input, context }) => {
    if (input.areaId) {
      const area = await context.repos.area.findById(context.userId, input.areaId);
      if (!area) notFound("Area");
    }

    const project = await context.repos.project.update(context.userId, input);
    return project ?? notFound("Project");
  }),

  setArchived: protectedProcedure
    .input(z.object({ id: idSchema, archived: z.boolean() }))
    .handler(async ({ input, context }) => {
      const project = await context.repos.project.setArchived(
        context.userId,
        input.id,
        input.archived,
      );
      return project ?? notFound("Project");
    }),

  remove: protectedProcedure
    .input(z.object({ id: idSchema }))
    .handler(async ({ input, context }) => {
      const removed = await context.repos.project.remove(context.userId, input.id);
      if (!removed) notFound("Project");
      return { id: input.id };
    }),
};
