import { z } from "zod";

import { areaColorSchema, idSchema, sortOrderSchema } from "./common";

/**
 * An Area is a long-lived bucket — Work, Research, Health. Projects live
 * inside one; loose tasks can too. Areas are what make "where did my time go?"
 * answerable at the level that matters.
 */
export const areaSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1).max(60),
  color: areaColorSchema,
  icon: z.string().max(40).nullable(),
  sortOrder: sortOrderSchema,
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Area = z.infer<typeof areaSchema>;

export const createAreaInput = areaSchema.pick({
  name: true,
  color: true,
  icon: true,
});

export type CreateAreaInput = z.infer<typeof createAreaInput>;

export const updateAreaInput = createAreaInput.partial().extend({
  id: idSchema,
  sortOrder: sortOrderSchema.optional(),
});

export type UpdateAreaInput = z.infer<typeof updateAreaInput>;

export const listAreasInput = z.object({
  includeArchived: z.boolean().default(false),
});

export type ListAreasInput = z.infer<typeof listAreasInput>;
