import { z } from "zod";

import { idSchema } from "./common";

export const THEMES = ["light", "dark", "system"] as const;

export const themeSchema = z.enum(THEMES);

export type Theme = z.infer<typeof themeSchema>;

/** 0 = Sunday … 6 = Saturday, matching date-fns. */
export const weekStartsOnSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export type WeekStartsOn = z.infer<typeof weekStartsOnSchema>;

export const userSettingsSchema = z.object({
  userId: idSchema,

  /** IANA zone. The source of truth for "today" — not the browser's clock. */
  timezone: z.string().min(1),
  weekStartsOn: weekStartsOnSchema,
  /** Soft cap used by the capacity meter. Informs, never blocks. */
  dailyCapacityMin: z
    .number()
    .int()
    .min(30)
    .max(24 * 60),

  pomodoroWorkMin: z.number().int().min(1).max(180),
  shortBreakMin: z.number().int().min(1).max(60),
  longBreakMin: z.number().int().min(1).max(120),
  longBreakEvery: z.number().int().min(2).max(12),

  soundEnabled: z.boolean(),
  tickingEnabled: z.boolean(),
  theme: themeSchema,

  updatedAt: z.date(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateSettingsInput = userSettingsSchema
  .omit({ userId: true, updatedAt: true })
  .partial();

export type UpdateSettingsInput = z.infer<typeof updateSettingsInput>;

export const DEFAULT_SETTINGS = {
  timezone: "Europe/London",
  weekStartsOn: 1,
  dailyCapacityMin: 6 * 60,
  pomodoroWorkMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  soundEnabled: true,
  tickingEnabled: false,
  theme: "system",
} as const satisfies Omit<UserSettings, "userId" | "updatedAt">;
