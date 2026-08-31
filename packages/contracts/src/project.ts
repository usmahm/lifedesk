import { z } from "zod";

import { calendarDaySchema, idSchema, sortOrderSchema } from "./common";

export const PROJECT_STATUSES = ["active", "paused", "done"] as const;

export const projectStatusSchema = z.enum(PROJECT_STATUSES);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

/** A Project is a finite piece of work inside an Area. */
export const projectSchema = z.object({
  id: idSchema,
  userId: idSchema,
  areaId: idSchema.nullable(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable(),
  status: projectStatusSchema,
  startDate: calendarDaySchema.nullable(),
  dueDate: calendarDaySchema.nullable(),
  sortOrder: sortOrderSchema,
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectInput = projectSchema.pick({
  areaId: true,
  name: true,
  description: true,
  startDate: true,
  dueDate: true,
});

export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const updateProjectInput = createProjectInput.partial().extend({
  id: idSchema,
  status: projectStatusSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectInput>;

export const listProjectsInput = z.object({
  areaId: idSchema.nullish(),
  status: projectStatusSchema.optional(),
  includeArchived: z.boolean().default(false),
});

export type ListProjectsInput = z.infer<typeof listProjectsInput>;
