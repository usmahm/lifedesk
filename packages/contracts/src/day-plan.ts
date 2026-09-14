import { z } from "zod";

import { calendarDaySchema, idSchema } from "./common";

/**
 * One line naming what a day is for.
 *
 * The design calls the intention the loudest thing on the Today screen, above
 * the task list — a day with five tasks and no point to them is the failure
 * this is meant to catch.
 *
 * Rows are created on write, never ahead of time: no row means no intention,
 * which is the usual state, and pre-creating one per day would be 365 near-
 * empty rows a year to represent nothing.
 */
export const dayPlanSchema = z.object({
  userId: idSchema,
  /** Keyed by calendar day in the user's zone, like `Task.scheduledFor`. */
  day: calendarDaySchema,
  /**
   * Null means never set. Deliberately not defaulted to "" — "never written"
   * and "written then cleared" render differently, placeholder against blank.
   */
  intention: z.string().max(280).nullable(),
});

export type DayPlan = z.infer<typeof dayPlanSchema>;

export const getDayPlanInput = z.object({
  day: calendarDaySchema,
});

export type GetDayPlanInput = z.infer<typeof getDayPlanInput>;

export const setIntentionInput = z.object({
  day: calendarDaySchema,
  /** Null, or blank after trimming, clears it. */
  intention: z.string().max(280).nullable(),
});

export type SetIntentionInput = z.infer<typeof setIntentionInput>;
