import type { WeekStartsOn } from "@lifedesk/contracts";

/** 0 = Sunday … 6 = Saturday, matching date-fns and the contract. */
export const WEEK_START_OPTIONS: { value: WeekStartsOn; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 0, label: "Sunday" },
  { value: 6, label: "Saturday" },
];

/** Matches the floor in userSettingsSchema. */
export const MIN_DAILY_CAPACITY_MIN = 30;

/** Both match the bounds on `longBreakEvery` in userSettingsSchema. */
export const MIN_LONG_BREAK_EVERY = 2;
export const MAX_LONG_BREAK_EVERY = 12;
