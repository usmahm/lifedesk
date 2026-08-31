import type {
  Area,
  CalendarDay,
  Project,
  Tag,
  Task,
  TaskWithMeta,
  TimeSession,
  UserSettings,
} from "@lifedesk/contracts";
import type { Prisma } from "@lifedesk/db";

/**
 * Database rows → contract types.
 *
 * Almost everything lines up one-to-one, because the schema was written from
 * the contracts. The one genuine difference is calendar days: Postgres holds
 * them as `varchar(10)` and Prisma hands back a plain `string`, while the
 * contract wants the branded `CalendarDay`.
 *
 * The brand is asserted rather than parsed. These values are constrained by
 * the column and only ever written through the contract, so validating on
 * every read would cost a regex per row to re-prove what the write path
 * already guarantees. Anything arriving from a *client* still goes through the
 * Zod schema — that is where untrusted input is checked.
 */

function day(value: string | null): CalendarDay | null {
  return value as CalendarDay | null;
}

export function toArea(row: Prisma.AreaModel): Area {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toProject(row: Prisma.ProjectModel): Project {
  return {
    id: row.id,
    userId: row.userId,
    areaId: row.areaId,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: day(row.startDate),
    dueDate: day(row.dueDate),
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toTask(row: Prisma.TaskModel): Task {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    areaId: row.areaId,
    parentTaskId: row.parentTaskId,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    estimateMin: row.estimateMin,
    scheduledFor: day(row.scheduledFor),
    dueDate: day(row.dueDate),
    plannedStartMin: row.plannedStartMin,
    plannedEndMin: row.plannedEndMin,
    completedAt: row.completedAt,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** A task row selected with its tag links, plus a separately-aggregated total. */
export type TaskRowWithTags = Prisma.TaskModel & { tags: { tagId: string }[] };

export function toTaskWithMeta(row: TaskRowWithTags, trackedSec: number): TaskWithMeta {
  return {
    ...toTask(row),
    trackedSec,
    tagIds: row.tags.map((link) => link.tagId),
  };
}

export function toTag(row: Prisma.TagModel): Tag {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt,
  };
}

export function toSession(row: Prisma.TimeSessionModel): TimeSession {
  return {
    id: row.id,
    userId: row.userId,
    taskId: row.taskId,
    projectId: row.projectId,
    areaId: row.areaId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSec: row.durationSec,
    source: row.source,
    note: row.note,
    needsReview: row.needsReview,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toSettings(row: Prisma.UserSettingsModel): UserSettings {
  return {
    userId: row.userId,
    timezone: row.timezone,
    // The column is a plain int; the contract narrows it to 0–6.
    weekStartsOn: row.weekStartsOn as UserSettings["weekStartsOn"],
    dailyCapacityMin: row.dailyCapacityMin,
    pomodoroWorkMin: row.pomodoroWorkMin,
    shortBreakMin: row.shortBreakMin,
    longBreakMin: row.longBreakMin,
    longBreakEvery: row.longBreakEvery,
    soundEnabled: row.soundEnabled,
    tickingEnabled: row.tickingEnabled,
    theme: row.theme,
    updatedAt: row.updatedAt,
  };
}
