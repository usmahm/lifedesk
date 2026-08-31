import { createTagInput, idSchema, updateTagInput } from "@lifedesk/contracts";
import { z } from "zod";

import { notFound, protectedProcedure } from "../orpc";

export const tagRouter = {
  list: protectedProcedure.handler(({ context }) => context.repos.tag.list(context.userId)),

  create: protectedProcedure
    .input(createTagInput)
    .handler(({ input, context }) => context.repos.tag.create(context.userId, input)),

  update: protectedProcedure.input(updateTagInput).handler(async ({ input, context }) => {
    const tag = await context.repos.tag.update(context.userId, input);
    return tag ?? notFound("Tag");
  }),

  remove: protectedProcedure
    .input(z.object({ id: idSchema }))
    .handler(async ({ input, context }) => {
      const removed = await context.repos.tag.remove(context.userId, input.id);
      if (!removed) notFound("Tag");
      return { id: input.id };
    }),
};
