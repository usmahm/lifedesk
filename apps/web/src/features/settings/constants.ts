import type { WeekStartsOn } from "@lifedesk/contracts";

/** 0 = Sunday … 6 = Saturday, matching date-fns and the contract. */
export const WEEK_START_OPTIONS: { value: WeekStartsOn; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 0, label: "Sunday" },
  { value: 6, label: "Saturday" },
];
