import { createAreaInput, idSchema, listAreasInput, updateAreaInput } from "@lifedesk/contracts";
import { z } from "zod";

import { notFound, protectedProcedure } from "../orpc";

export const areaRouter = {
  list: protectedProcedure
    .input(listAreasInput)
    .handler(({ input, context }) => context.repos.area.list(context.userId, input)),

  get: protectedProcedure.input(z.object({ id: idSchema })).handler(async ({ input, context }) => {
    const area = await context.repos.area.findById(context.userId, input.id);
    return area ?? notFound("Area");
  }),

  create: protectedProcedure
    .input(createAreaInput)
    .handler(({ input, context }) => context.repos.area.create(context.userId, input)),

  update: protectedProcedure.input(updateAreaInput).handler(async ({ input, context }) => {
    const area = await context.repos.area.update(context.userId, input);
    return area ?? notFound("Area");
  }),

  setArchived: protectedProcedure
    .input(z.object({ id: idSchema, archived: z.boolean() }))
    .handler(async ({ input, context }) => {
      const area = await context.repos.area.setArchived(context.userId, input.id, input.archived);
      return area ?? notFound("Area");
    }),
};
