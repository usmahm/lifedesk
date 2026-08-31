import { z } from "zod";

import {
  calendarDaySchema,
  cursorPageSchema,
  endMinuteSchema,
  idSchema,
  sortOrderSchema,
  startMinuteSchema,
} from "./common";

export const TASK_STATUSES = ["todo", "doing", "done", "cancelled"] as const;

export const taskStatusSchema = z.enum(TASK_STATUSES);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const TASK_PRIORITIES = ["none", "low", "medium", "high"] as const;

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskSchema = z.object({
  id: idSchema,
  userId: idSchema,
  projectId: idSchema.nullable(),
  areaId: idSchema.nullable(),
  /** One level of nesting only — deep trees are where planners go to die. */
  parentTaskId: idSchema.nullable(),

  title: z.string().min(1).max(200),
  notes: z.string().max(20_000).nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,

  /** Minutes the user expects this to take. Compared against tracked time. */
  estimateMin: z.number().int().min(1).max(24 * 60).nullable(),
  /** The day this is *committed to*, in the user's timezone. */
  scheduledFor: calendarDaySchema.nullable(),
  /** The day this is *due*. Distinct from when it's planned. */
  dueDate: calendarDaySchema.nullable(),

  /**
   * When on that day the time is set aside — a block on the grid.
   *
   * Deliberately separate from `estimateMin`: an estimate is how long you
   * think it takes, a block is when you reserved the time. Coupling them means
   * revising an estimate silently resizes your calendar. Keeping both also
   * surfaces a real signal — blocked 2h, estimated 3h.
   *
   * Both null or both set; only meaningful alongside `scheduledFor`.
   */
  plannedStartMin: startMinuteSchema.nullable(),
  plannedEndMin: endMinuteSchema.nullable(),

  completedAt: z.date().nullable(),
  sortOrder: sortOrderSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Task = z.infer<typeof taskSchema>;

/** A task plus the derived values every list needs. Assembled by the repo. */
export const taskWithMetaSchema = taskSchema.extend({
  /** Seconds tracked against this task across all sessions. */
  trackedSec: z.number().int().min(0),
  tagIds: z.array(idSchema),
});

export type TaskWithMeta = z.infer<typeof taskWithMetaSchema>;

export const createTaskInput = taskSchema
  .pick({
    projectId: true,
    areaId: true,
    parentTaskId: true,
    title: true,
    notes: true,
    priority: true,
    estimateMin: true,
    scheduledFor: true,
    dueDate: true,
    plannedStartMin: true,
    plannedEndMin: true,
  })
  .partial()
  .required({ title: true });

export type CreateTaskInput = z.infer<typeof createTaskInput>;

export const updateTaskInput = createTaskInput.partial().extend({
  id: idSchema,
  status: taskStatusSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInput>;

export const taskFiltersSchema = z.object({
  status: z.array(taskStatusSchema).optional(),
  areaId: idSchema.nullish(),
  projectId: idSchema.nullish(),
  tagId: idSchema.nullish(),
  /** Exactly this day. */
  scheduledFor: calendarDaySchema.optional(),
  /** Inclusive range — used by the week view. */
  scheduledFrom: calendarDaySchema.optional(),
  scheduledTo: calendarDaySchema.optional(),
  /** Inbox: no day committed yet. */
  unscheduled: z.boolean().optional(),
  search: z.string().max(200).optional(),
});

export type TaskFilters = z.infer<typeof taskFiltersSchema>;

export const listTasksInput = z.object({
  filters: taskFiltersSchema.default({}),
  page: cursorPageSchema.default({ limit: 50 }),
});

export type ListTasksInput = z.infer<typeof listTasksInput>;

export const setTaskTagsInput = z.object({
  id: idSchema,
  tagIds: z.array(idSchema),
});

export type SetTaskTagsInput = z.infer<typeof setTaskTagsInput>;

/**
 * Block a task into a time range on its scheduled day, or clear the block by
 * passing null for both.
 *
 * A block belongs to exactly one day — ranges crossing midnight are not
 * supported. Split them, or leave the tail untracked.
 */
export const setTaskPlannedTimeInput = z
  .object({
    id: idSchema,
    plannedStartMin: startMinuteSchema.nullable(),
    plannedEndMin: endMinuteSchema.nullable(),
  })
  .refine((v) => (v.plannedStartMin === null) === (v.plannedEndMin === null), {
    message: "Set both a start and an end, or neither",
    path: ["plannedEndMin"],
  })
  .refine(
    (v) =>
      v.plannedStartMin === null ||
      v.plannedEndMin === null ||
      v.plannedEndMin > v.plannedStartMin,
    { message: "End must be after start", path: ["plannedEndMin"] },
  );

export type SetTaskPlannedTimeInput = z.infer<typeof setTaskPlannedTimeInput>;
