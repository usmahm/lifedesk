import {
  createSessionInput,
  idSchema,
  listSessionsInput,
  startSessionInput,
  stopSessionInput,
  updateSessionInput,
} from "@lifedesk/contracts";
import { calendarDayRange, isRunawaySession, todayIn } from "@lifedesk/core/time";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { notFound, protectedProcedure } from "../orpc";

export const sessionRouter = {
  /**
   * The running session plus the server's clock.
   *
   * `serverNow` lets the client correct for a wrong system clock: elapsed time
   * is always derived from `startedAt`, never accumulated in an interval, so a
   * refresh, a closed tab, or a sleeping laptop can't lose or invent time.
   */
  running: protectedProcedure.handler(async ({ context }) => ({
    session: await context.repos.session.running(context.userId),
    serverNow: context.now(),
  })),

  list: protectedProcedure.input(listSessionsInput).handler(async ({ input, context }) => {
    const settings = await context.repos.settings.get(context.userId);

    // Day filters are calendar days in the user's zone; the repository works
    // in UTC instants. Resolve here so storage never guesses a timezone.
    const range =
      input.filters.from || input.filters.to
        ? {
            start: calendarDayRange(
              input.filters.from ?? input.filters.to!,
              settings.timezone,
            ).start,
            end: calendarDayRange(input.filters.to ?? input.filters.from!, settings.timezone).end,
          }
        : null;

    return context.repos.session.list(context.userId, input.filters, input.page, range);
  }),

  start: protectedProcedure.input(startSessionInput).handler(async ({ input, context }) => {
    const existing = await context.repos.session.running(context.userId);
    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: "A session is already running. Stop it before starting another.",
      });
    }

    // Denormalize area and project at start, so moving the task later can't
    // rewrite last month's report.
    const task = input.taskId
      ? await context.repos.task.findById(context.userId, input.taskId)
      : null;
    if (input.taskId && !task) notFound("Task");

    return context.repos.session.start(context.userId, {
      taskId: task?.id ?? null,
      projectId: task?.projectId ?? null,
      areaId: task?.areaId ?? null,
      source: input.source,
      startedAt: context.now(),
    });
  }),

  stop: protectedProcedure.input(stopSessionInput).handler(async ({ input, context }) => {
    const existing = await context.repos.session.findById(context.userId, input.id);
    if (!existing) notFound("Session");
    if (existing.endedAt) {
      throw new ORPCError("CONFLICT", { message: "That session has already been stopped." });
    }

    const endedAt = context.now();

    return context.repos.session.stop(
      context.userId,
      input.id,
      endedAt,
      input.note ?? null,
      // A timer left running overnight gets flagged rather than silently
      // logging fourteen hours of "deep work".
      isRunawaySession(existing.startedAt, endedAt),
    );
  }),

  /** Manual entry, for the times you forgot to start the timer. */
  create: protectedProcedure.input(createSessionInput).handler(async ({ input, context }) => {
    const task = input.taskId
      ? await context.repos.task.findById(context.userId, input.taskId)
      : null;
    if (input.taskId && !task) notFound("Task");

    return context.repos.session.create(context.userId, {
      taskId: task?.id ?? null,
      projectId: task?.projectId ?? null,
      areaId: task?.areaId ?? null,
      source: "manual",
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      note: input.note ?? null,
      needsReview: false,
    });
  }),

  update: protectedProcedure.input(updateSessionInput).handler(async ({ input, context }) => {
    const existing = await context.repos.session.findById(context.userId, input.id);
    if (!existing) notFound("Session");

    // Re-point the denormalized ids only when the task actually changes.
    const retarget =
      input.taskId !== undefined && input.taskId !== existing.taskId
        ? input.taskId
          ? await context.repos.task.findById(context.userId, input.taskId)
          : null
        : undefined;

    if (input.taskId && retarget === null) notFound("Task");

    const session = await context.repos.session.update(context.userId, {
      id: input.id,
      ...(retarget !== undefined && {
        taskId: retarget?.id ?? null,
        projectId: retarget?.projectId ?? null,
        areaId: retarget?.areaId ?? null,
      }),
      ...(input.startedAt !== undefined && { startedAt: input.startedAt }),
      ...(input.endedAt !== undefined && { endedAt: input.endedAt }),
      ...(input.note !== undefined && { note: input.note ?? null }),
      ...(input.needsReview !== undefined && { needsReview: input.needsReview }),
    });

    return session ?? notFound("Session");
  }),

  remove: protectedProcedure
    .input(z.object({ id: idSchema }))
    .handler(async ({ input, context }) => {
      const removed = await context.repos.session.remove(context.userId, input.id);
      if (!removed) notFound("Session");
      return { id: input.id };
    }),

  /** Total tracked today, for the timer bar. */
  totalForToday: protectedProcedure.handler(async ({ context }) => {
    const settings = await context.repos.settings.get(context.userId);
    const today = todayIn(settings.timezone, context.now());

    return {
      day: today,
      totalSec: await context.repos.session.totalSecondsInRange(
        context.userId,
        calendarDayRange(today, settings.timezone),
      ),
    };
  }),
};
