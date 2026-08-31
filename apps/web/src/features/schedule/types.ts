import type { AreaColor, CalendarDay } from "@lifedesk/contracts";

/**
 * One block on the grid.
 *
 * `layer` distinguishes what the block means. Today and Week pass `"planned"`;
 * Sessions passes `"actual"`. They are never mixed on one grid yet — overlaying
 * plan against actual is deliberately deferred, and `DayGrid` takes the layer
 * now so that arrives as a second pass rather than a rewrite.
 */
export type ScheduleLayer = "planned" | "actual";

export type GridItem = {
  id: string;
  startMin: number;
  endMin: number;
  title: string;
  subtitle?: string;
  color?: AreaColor;
  layer?: ScheduleLayer;
  isDone?: boolean;
  isRunning?: boolean;
};

export type GridDay = {
  day: CalendarDay;
  items: GridItem[];
};
