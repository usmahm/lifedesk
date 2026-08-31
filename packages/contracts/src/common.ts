import { z } from "zod";

/**
 * A calendar day in the *user's* timezone — never a timestamp at midnight.
 *
 * "Scheduled for Thursday" means Thursday wherever the user is; it must not
 * shift when they travel. Branded so it can't be confused with a plain string
 * or an Instant. See .claude/rules/dates-and-timezones.md.
 */
export const calendarDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD calendar day")
  .brand<"CalendarDay">();

export type CalendarDay = z.infer<typeof calendarDaySchema>;

/** A precise moment on the world clock. Always stored and transported as UTC. */
export const instantSchema = z.date();

export type Instant = z.infer<typeof instantSchema>;

export const idSchema = z.uuid();

/** Fixed eight-hue area palette. See .claude/rules/design-tokens.md. */
export const AREA_COLORS = [
  "clay",
  "amber",
  "olive",
  "teal",
  "indigo",
  "plum",
  "rose",
  "slate",
] as const;

export const areaColorSchema = z.enum(AREA_COLORS);

export type AreaColor = z.infer<typeof areaColorSchema>;

/**
 * Cursor pagination. Offsets are deliberately not offered — they degrade in
 * Postgres and the repository interface has to stay Prisma-shaped.
 * See .claude/rules/data-access.md.
 */
export const cursorPageSchema = z.object({
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(200).default(50),
});

/** What a caller sends — `limit` optional. */
export type CursorPage = z.input<typeof cursorPageSchema>;

/** What a repository receives — `limit` resolved by the schema default. */
export type ResolvedCursorPage = z.output<typeof cursorPageSchema>;

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

/** Sort position. Explicit from day one so drag-and-drop is a UI change later. */
export const sortOrderSchema = z.number().int();

export const MINUTES_PER_DAY = 1440;

/**
 * A wall-clock time on a day, as minutes from local midnight.
 *
 * Planned time is an intent — "09:00 on Thursday" means 09:00 wherever you
 * are. Stored as a plain minute offset alongside a CalendarDay, it cannot
 * drift when you travel or when the clocks change. A UTC instant would.
 * See .claude/rules/dates-and-timezones.md.
 */
export const startMinuteSchema = z
  .number()
  .int()
  .min(0)
  .max(MINUTES_PER_DAY - 1);

/** Exclusive end, so a block may finish at midnight. */
export const endMinuteSchema = z.number().int().min(1).max(MINUTES_PER_DAY);
