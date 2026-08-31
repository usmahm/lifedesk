import type { Area, TaskWithMeta, TimeSession } from "@lifedesk/contracts";
import { minuteOfDayIn } from "@lifedesk/core/time";

import type { GridItem } from "../types";

/**
 * Turning domain rows into blocks.
 *
 * Kept out of the components so the grid stays a dumb renderer and these
 * mappings can be reused by Today, Week, and Sessions unchanged.
 */

function colorOf(areas: readonly Area[] | undefined, areaId: string | null) {
  return areas?.find((area) => area.id === areaId)?.color;
}

/** Only tasks that have actually been blocked can be drawn. */
export function tasksToGridItems(
  tasks: readonly TaskWithMeta[],
  areas: readonly Area[] | undefined,
  runningTaskId: string | null | undefined,
): GridItem[] {
  return tasks
    .filter(
      (task): task is TaskWithMeta & { plannedStartMin: number; plannedEndMin: number } =>
        task.plannedStartMin !== null && task.plannedEndMin !== null,
    )
    .map((task) => ({
      id: task.id,
      startMin: task.plannedStartMin,
      endMin: task.plannedEndMin,
      title: task.title,
      color: colorOf(areas, task.areaId),
      layer: "planned",
      isDone: task.status === "done",
      isRunning: task.id === runningTaskId,
    }));
}

/**
 * Sessions on a minute-of-day axis.
 *
 * A session is an instant range, so it has to be projected into the user's
 * local day. One that started yesterday and ran past midnight is clamped to
 * this day's edge rather than being dropped — a block cannot cross midnight.
 */
export function sessionsToGridItems(
  sessions: readonly TimeSession[],
  areas: readonly Area[] | undefined,
  timezone: string,
  titleFor: (session: TimeSession) => string,
  nowMinute: number,
): GridItem[] {
  return sessions
    .map((session): GridItem | null => {
      const startMin = minuteOfDayIn(session.startedAt, timezone);
      // A running session is drawn up to the current moment.
      const endMin = session.endedAt ? minuteOfDayIn(session.endedAt, timezone) : nowMinute;

      // Ran past midnight — clamp to the end of this day.
      const clampedEnd = endMin <= startMin ? 1440 : endMin;
      if (clampedEnd - startMin < 1) return null;

      return {
        id: session.id,
        startMin,
        endMin: clampedEnd,
        title: titleFor(session),
        color: colorOf(areas, session.areaId),
        layer: "actual",
        isRunning: session.endedAt === null,
      };
    })
    .filter((item): item is GridItem => item !== null);
}
