import {
  calendarDaySchema,
  createTaskInput,
  idSchema,
  listTasksInput,
  setTaskPlannedTimeInput,
  setTaskTagsInput,
  updateTaskInput,
} from "@lifedesk/contracts";
import { summarizeCapacity } from "@lifedesk/core/capacity";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { notFound, protectedProcedure } from "../orpc";

export const taskRouter = {
  list: protectedProcedure
    .input(listTasksInput)
    .handler(({ input, context }) =>
      context.repos.task.list(context.userId, input.filters, input.page),
    ),

  get: protectedProcedure.input(z.object({ id: idSchema })).handler(async ({ input, context }) => {
    const task = await context.repos.task.findById(context.userId, input.id);
    return task ?? notFound("Task");
  }),

  create: protectedProcedure
    .input(createTaskInput)
    .handler(({ input, context }) => context.repos.task.create(context.userId, input)),

  update: protectedProcedure.input(updateTaskInput).handler(async ({ input, context }) => {
    const task = await context.repos.task.update(context.userId, input);
    return task ?? notFound("Task");
  }),

  /** Toggle is its own procedure so the optimistic update has one clean target. */
  setComplete: protectedProcedure
    .input(z.object({ id: idSchema, complete: z.boolean() }))
    .handler(async ({ input, context }) => {
      const task = await context.repos.task.update(context.userId, {
        id: input.id,
        status: input.complete ? "done" : "todo",
      });
      return task ?? notFound("Task");
    }),

  /** Move to a day, or back to the inbox with null. */
  schedule: protectedProcedure
    .input(z.object({ id: idSchema, scheduledFor: calendarDaySchema.nullable() }))
    .handler(async ({ input, context }) => {
      const task = await context.repos.task.update(context.userId, {
        id: input.id,
        scheduledFor: input.scheduledFor,
      });
      return task ?? notFound("Task");
    }),

  /**
   * Block a task into a time range on its scheduled day, or clear the block.
   *
   * Its own procedure rather than a plain update, so the grid has one clean
   * target to invalidate and one clean target for an optimistic move later.
   */
  setPlannedTime: protectedProcedure
    .input(setTaskPlannedTimeInput)
    .handler(async ({ input, context }) => {
      const existing = await context.repos.task.findById(context.userId, input.id);
      if (!existing) notFound("Task");

      // A block is a time *on a day*. Without a day there is nowhere to draw
      // it, so refuse rather than storing something unreachable.
      if (input.plannedStartMin !== null && existing.scheduledFor === null) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Give the task a day before blocking time for it.",
        });
      }

      const task = await context.repos.task.update(context.userId, {
        id: input.id,
        plannedStartMin: input.plannedStartMin,
        plannedEndMin: input.plannedEndMin,
      });

      return task ?? notFound("Task");
    }),

  remove: protectedProcedure
    .input(z.object({ id: idSchema }))
    .handler(async ({ input, context }) => {
      const removed = await context.repos.task.remove(context.userId, input.id);
      if (!removed) notFound("Task");
      return { id: input.id };
    }),

  setTags: protectedProcedure.input(setTaskTagsInput).handler(async ({ input, context }) => {
    const task = await context.repos.task.setTags(context.userId, input.id, input.tagIds);
    return task ?? notFound("Task");
  }),

  /**
   * The capacity meter.
   *
   * Computed server-side so the client never adds up estimates itself — one of
   * the four design principles is that time is shown, never calculated.
   */
  capacityForDay: protectedProcedure
    .input(z.object({ day: calendarDaySchema }))
    .handler(async ({ input, context }) => {
      const [inputs, settings] = await Promise.all([
        context.repos.task.capacityInputsForDay(context.userId, input.day),
        context.repos.settings.get(context.userId),
      ]);

      return summarizeCapacity(inputs, settings.dailyCapacityMin);
    }),
};
