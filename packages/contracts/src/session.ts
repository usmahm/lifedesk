import { z } from "zod";

import { calendarDaySchema, cursorPageSchema, idSchema } from "./common";

export const SESSION_SOURCES = ["timer", "pomodoro", "manual"] as const;

export const sessionSourceSchema = z.enum(SESSION_SOURCES);

export type SessionSource = z.infer<typeof sessionSourceSchema>;

/**
 * A tracked stretch of work.
 *
 * `areaId` and `projectId` are denormalized here on purpose, captured at the
 * moment the session starts. Move a task to a different project later and last
 * month's report must not silently rewrite itself.
 */
export const timeSessionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  taskId: idSchema.nullable(),
  projectId: idSchema.nullable(),
  areaId: idSchema.nullable(),

  startedAt: z.date(),
  /** Null means running. At most one running session per user. */
  endedAt: z.date().nullable(),
  /** Integer seconds, set on stop. Null while running. */
  durationSec: z.number().int().min(0).nullable(),

  source: sessionSourceSchema,
  note: z.string().max(2000).nullable(),
  /**
   * Set when a session ran past RUNAWAY_SESSION_HOURS — almost always a timer
   * the user forgot to stop. Flagged for review rather than silently logging
   * fourteen hours.
   */
  needsReview: z.boolean(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TimeSession = z.infer<typeof timeSessionSchema>;

export const startSessionInput = z.object({
  taskId: idSchema.nullish(),
  source: sessionSourceSchema.default("timer"),
});

export type StartSessionInput = z.infer<typeof startSessionInput>;

export const stopSessionInput = z.object({
  id: idSchema,
  note: z.string().max(2000).nullish(),
});

export type StopSessionInput = z.infer<typeof stopSessionInput>;

/** Manual entry, for the times you forgot to start the timer. */
export const createSessionInput = z
  .object({
    taskId: idSchema.nullish(),
    startedAt: z.date(),
    endedAt: z.date(),
    note: z.string().max(2000).nullish(),
  })
  .refine((v) => v.endedAt > v.startedAt, {
    message: "End must be after start",
    path: ["endedAt"],
  });

export type CreateSessionInput = z.infer<typeof createSessionInput>;

export const updateSessionInput = z
  .object({
    id: idSchema,
    taskId: idSchema.nullish(),
    startedAt: z.date().optional(),
    endedAt: z.date().optional(),
    note: z.string().max(2000).nullish(),
    needsReview: z.boolean().optional(),
  })
  .refine((v) => !v.startedAt || !v.endedAt || v.endedAt > v.startedAt, {
    message: "End must be after start",
    path: ["endedAt"],
  });

export type UpdateSessionInput = z.infer<typeof updateSessionInput>;

export const listSessionsInput = z.object({
  filters: z
    .object({
      taskId: idSchema.nullish(),
      areaId: idSchema.nullish(),
      projectId: idSchema.nullish(),
      /** Inclusive range of calendar days in the user's timezone. */
      from: calendarDaySchema.optional(),
      to: calendarDaySchema.optional(),
      needsReview: z.boolean().optional(),
    })
    .default({}),
  page: cursorPageSchema.default({ limit: 50 }),
});

export type ListSessionsInput = z.infer<typeof listSessionsInput>;

/**
 * Returned alongside the running session so the client can correct for a wrong
 * system clock. Elapsed time is always derived from `startedAt`, never
 * accumulated in an interval. See .claude/rules/dates-and-timezones.md.
 */
export const runningSessionSchema = z.object({
  session: timeSessionSchema.nullable(),
  serverNow: z.date(),
});

export type RunningSession = z.infer<typeof runningSessionSchema>;
