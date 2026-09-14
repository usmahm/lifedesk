import type { TaskWithMeta } from "@lifedesk/contracts";

/**
 * The shape an optimistic cache patch may take.
 *
 * Day fields are plain strings rather than `CalendarDay` because oRPC mutation
 * variables are the *input* side of the schema, where the brand has not been
 * applied yet. At runtime they are the same strings — the brand exists to stop
 * unvalidated input reaching the domain, and these already came through Zod.
 */
export type TaskPatch = Partial<Omit<TaskWithMeta, "scheduledFor" | "dueDate">> &
  Partial<Record<"scheduledFor" | "dueDate", string | null>>;
