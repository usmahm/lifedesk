import { z } from "zod";

import { areaColorSchema, idSchema } from "./common";

/** Tags cut across Areas and Projects — #deep-work, #admin, #reading. */
export const tagSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1).max(40),
  color: areaColorSchema,
  createdAt: z.date(),
});

export type Tag = z.infer<typeof tagSchema>;

export const createTagInput = tagSchema.pick({ name: true, color: true });

export type CreateTagInput = z.infer<typeof createTagInput>;

export const updateTagInput = createTagInput.partial().extend({ id: idSchema });

export type UpdateTagInput = z.infer<typeof updateTagInput>;
