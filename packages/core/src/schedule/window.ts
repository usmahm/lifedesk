import { MINUTES_PER_DAY, type DayWindow } from "../time/minutes";

import type { ScheduleItem } from "./layout";

/**
 * Which hours the grid actually shows.
 *
 * A full 24-hour axis is mostly dead space — nothing happens between midnight
 * and six, and rendering it pushes the part you care about off the screen.
 *
 * The window is a fixed default that *expands* to contain anything outside it,
 * rather than being derived purely from content. A purely derived window jumps
 * every time you add the day's first block, and a jumping axis is disorienting.
 */

/** 06:00–23:00. */
export const DEFAULT_WINDOW: DayWindow = { startMin: 6 * 60, endMin: 23 * 60 };

/** Never collapse to a sliver, however little is on the day. */
const MIN_SPAN_MINUTES = 6 * 60;

function floorToHour(minute: number): number {
  return Math.floor(minute / 60) * 60;
}

function ceilToHour(minute: number): number {
  return Math.ceil(minute / 60) * 60;
}

export function dayWindow(
  items: readonly ScheduleItem[],
  defaults: DayWindow = DEFAULT_WINDOW,
): DayWindow {
  let startMin = defaults.startMin;
  let endMin = defaults.endMin;

  for (const item of items) {
    if (item.endMin <= item.startMin) continue;
    // Snap outward to whole hours so the axis labels stay clean.
    if (item.startMin < startMin) startMin = floorToHour(item.startMin);
    if (item.endMin > endMin) endMin = ceilToHour(item.endMin);
  }

  startMin = Math.max(0, startMin);
  endMin = Math.min(MINUTES_PER_DAY, endMin);

  if (endMin - startMin < MIN_SPAN_MINUTES) {
    endMin = Math.min(MINUTES_PER_DAY, startMin + MIN_SPAN_MINUTES);
    startMin = Math.max(0, endMin - MIN_SPAN_MINUTES);
  }

  return { startMin, endMin };
}

/**
 * The same, but guaranteed to include a particular minute — used to keep the
 * current-time line visible on today even before anything is blocked.
 */
export function dayWindowIncluding(
  items: readonly ScheduleItem[],
  minuteOfDay: number,
  defaults: DayWindow = DEFAULT_WINDOW,
): DayWindow {
  const base = dayWindow(items, defaults);

  return {
    startMin: Math.max(0, Math.min(base.startMin, floorToHour(minuteOfDay))),
    endMin: Math.min(MINUTES_PER_DAY, Math.max(base.endMin, ceilToHour(minuteOfDay))),
  };
}
