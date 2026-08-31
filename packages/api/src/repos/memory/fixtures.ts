import {
  DEFAULT_SETTINGS,
  type Area,
  type AreaColor,
  type CalendarDay,
  type Project,
  type Tag,
  type Task,
  type TaskStatus,
  type TimeSession,
} from "@lifedesk/contracts";
import { addDays, elapsedSeconds, instantAt, startOfWeek, todayIn } from "@lifedesk/core/time";

import { newId, type MemoryDb } from "./store";

/**
 * Phase 1 seed data.
 *
 * Deliberately realistic rather than minimal: a research project mid-flight,
 * a week where some days are full and others empty, an inbox with real
 * clutter, and last week's sessions so charts have something to draw.
 *
 * Clean fixtures hide exactly the layout problems the UI phase exists to find
 * — long titles that wrap, days with nothing on them, tasks with no estimate.
 */

export const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";

export const DEV_USER = {
  id: DEV_USER_ID,
  name: "Ahmad",
  email: "ahmad@lifedesk.local",
  image: null,
} as const;

const TZ = DEFAULT_SETTINGS.timezone;

export function seedFixtures(db: MemoryDb, now: Date): void {
  const today = todayIn(TZ, now);
  const weekStart = startOfWeek(today, DEFAULT_SETTINGS.weekStartsOn);
  const day = (offset: number): CalendarDay => addDays(today, offset);

  db.settings.set(DEV_USER_ID, {
    ...DEFAULT_SETTINGS,
    userId: DEV_USER_ID,
    updatedAt: now,
  });

  // --- areas -------------------------------------------------------------

  const areaIds: Record<string, string> = {};
  const areaSpecs: [key: string, name: string, color: AreaColor, icon: string][] = [
    ["research", "Research", "indigo", "microscope"],
    ["work", "Work", "clay", "briefcase"],
    ["learning", "Learning", "teal", "book-open"],
    ["health", "Health", "olive", "heart-pulse"],
    ["admin", "Admin", "slate", "folder"],
  ];

  areaSpecs.forEach(([key, name, color, icon], index) => {
    const area: Area = {
      id: newId(),
      userId: DEV_USER_ID,
      name,
      color,
      icon,
      sortOrder: index,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    areaIds[key] = area.id;
    db.areas.set(area.id, area);
  });

  // --- projects ----------------------------------------------------------

  const projectIds: Record<string, string> = {};
  const projectSpecs: [
    key: string,
    areaKey: string,
    name: string,
    description: string | null,
    status: Project["status"],
    dueOffset: number | null,
  ][] = [
    [
      "paper",
      "research",
      "Attention ablations paper",
      "Submission target is the end of next month. Ablations first, then related work.",
      "active",
      21,
    ],
    ["litreview", "research", "Literature review", null, "active", null],
    [
      "migration",
      "work",
      "Q3 platform migration",
      "Move the remaining services off the legacy queue.",
      "active",
      14,
    ],
    ["onboarding", "work", "Onboarding revamp", null, "paused", null],
    ["rust", "learning", "Rust in practice", "One chapter a week, with exercises.", "active", null],
    ["phd", "admin", "PhD applications", "Three schools. References by the 15th.", "active", 45],
  ];

  projectSpecs.forEach(([key, areaKey, name, description, status, dueOffset], index) => {
    const project: Project = {
      id: newId(),
      userId: DEV_USER_ID,
      areaId: areaIds[areaKey] ?? null,
      name,
      description,
      status,
      startDate: null,
      dueDate: dueOffset === null ? null : day(dueOffset),
      sortOrder: index,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    projectIds[key] = project.id;
    db.projects.set(project.id, project);
  });

  // --- tags --------------------------------------------------------------

  const tagIds: Record<string, string> = {};
  const tagSpecs: [key: string, name: string, color: AreaColor][] = [
    ["deep", "deep-work", "indigo"],
    ["shallow", "shallow", "slate"],
    ["reading", "reading", "teal"],
    ["blocked", "blocked", "rose"],
  ];

  tagSpecs.forEach(([key, name, color]) => {
    const tag: Tag = { id: newId(), userId: DEV_USER_ID, name, color, createdAt: now };
    tagIds[key] = tag.id;
    db.tags.set(tag.id, tag);
  });

  // --- tasks -------------------------------------------------------------

  const taskIds: Record<string, string> = {};

  type TaskSpec = {
    key: string;
    title: string;
    area?: string;
    project?: string;
    scheduled?: number | null;
    estimate?: number | null;
    status?: TaskStatus;
    notes?: string;
    tags?: string[];
    due?: number;
    priority?: Task["priority"];
    /** Planned block, as minutes from local midnight. */
    block?: [startMin: number, endMin: number];
  };

  const taskSpecs: TaskSpec[] = [
    // today — a realistic mix, deliberately just over capacity
    {
      key: "ablations",
      title: "Rerun ablations with the fixed seed",
      block: [9 * 60, 12 * 60],
      area: "research",
      project: "paper",
      scheduled: 0,
      estimate: 120,
      status: "doing",
      priority: "high",
      tags: ["deep"],
      notes:
        "The variance across seeds was the reason the last run was unusable.\n\n- [ ] fix the seed in `train.py`\n- [ ] rerun all four configs\n- [ ] regenerate table 3",
    },
    {
      key: "chen",
      title: "Read Chen et al. on sparse attention",
      block: [10 * 60 + 30, 11 * 60 + 15],
      area: "research",
      project: "litreview",
      scheduled: 0,
      estimate: 45,
      tags: ["reading"],
    },
    {
      key: "queue",
      title: "Draft the migration rollback plan",
      block: [13 * 60, 14 * 60 + 30],
      area: "work",
      project: "migration",
      scheduled: 0,
      estimate: 90,
      priority: "high",
      tags: ["deep"],
    },
    {
      key: "standup",
      title: "Standup",
      area: "work",
      scheduled: 0,
      estimate: 15,
      status: "done",
      tags: ["shallow"],
    },
    {
      key: "email",
      title: "Clear inbox and reply to Sam about the timeline",
      area: "work",
      scheduled: 0,
      estimate: 30,
      tags: ["shallow"],
    },
    // Deliberately before the grid's 06:00 default, so the window has to
    // expand to reach it.
    {
      key: "walk",
      title: "Walk",
      area: "health",
      scheduled: 0,
      estimate: 30,
      block: [5 * 60 + 30, 6 * 60],
    },
    // a task with no estimate — the capacity meter under-reports, on purpose
    { key: "notes", title: "Tidy up yesterday's notes", area: "admin", scheduled: 0 },

    // tomorrow
    {
      key: "related",
      title: "Draft the related work section",
      block: [9 * 60, 12 * 60],
      area: "research",
      project: "paper",
      scheduled: 1,
      estimate: 180,
      tags: ["deep"],
    },
    {
      key: "refs",
      title: "Email Dr. Adeyemi about the reference",
      area: "admin",
      project: "phd",
      scheduled: 1,
      estimate: 20,
      due: 15,
      priority: "high",
    },

    // later this week
    {
      key: "rust3",
      title: "Rust chapter 3 — ownership exercises",
      block: [19 * 60, 20 * 60],
      area: "learning",
      project: "rust",
      scheduled: 3,
      estimate: 60,
    },
    {
      key: "table",
      title: "Regenerate table 3 and figure 2",
      block: [14 * 60, 14 * 60 + 45],
      area: "research",
      project: "paper",
      scheduled: 4,
      estimate: 45,
    },
    {
      key: "retro",
      title: "Migration retro with the platform team",
      block: [15 * 60, 16 * 60],
      area: "work",
      project: "migration",
      scheduled: 4,
      estimate: 60,
    },
    // day 5 is deliberately empty, so the week view has a gap to render

    // done earlier this week — gives the review page something to show
    {
      key: "seedbug",
      title: "Track down the seeding bug",
      area: "research",
      project: "paper",
      scheduled: -1,
      estimate: 90,
      status: "done",
      tags: ["deep"],
    },
    {
      key: "consumers",
      title: "Migrate the notification consumers",
      area: "work",
      project: "migration",
      scheduled: -1,
      estimate: 120,
      status: "done",
    },
    {
      key: "rust2",
      title: "Rust chapter 2",
      area: "learning",
      project: "rust",
      scheduled: -2,
      estimate: 60,
      status: "done",
    },
    {
      key: "gym",
      title: "Gym",
      area: "health",
      scheduled: -2,
      estimate: 45,
      status: "done",
    },
    {
      key: "abstract",
      title: "Rewrite the abstract",
      area: "research",
      project: "paper",
      scheduled: -3,
      estimate: 60,
      status: "done",
    },

    // inbox — captured, not yet committed to a day
    {
      key: "inbox1",
      title: "Look into whether the eval harness supports batched decoding",
      area: "research",
      estimate: 45,
    },
    { key: "inbox2", title: "Book the flight for the workshop", area: "admin", estimate: 20 },
    {
      key: "inbox3",
      title: "Read the Muennighoff scaling paper everyone keeps citing",
      area: "research",
      project: "litreview",
      tags: ["reading"],
    },
    { key: "inbox4", title: "Renew the library membership", area: "admin", estimate: 10 },
    {
      key: "inbox5",
      title: "Write up the ablation methodology properly before I forget it",
      area: "research",
      project: "paper",
      estimate: 60,
      tags: ["deep"],
    },
    { key: "inbox6", title: "Dentist", area: "health" },
  ];

  taskSpecs.forEach((spec, index) => {
    const scheduledFor =
      spec.scheduled === undefined || spec.scheduled === null ? null : day(spec.scheduled);
    const status = spec.status ?? "todo";

    const task: Task = {
      id: newId(),
      userId: DEV_USER_ID,
      projectId: spec.project ? (projectIds[spec.project] ?? null) : null,
      areaId: spec.area ? (areaIds[spec.area] ?? null) : null,
      parentTaskId: null,
      title: spec.title,
      notes: spec.notes ?? null,
      status,
      priority: spec.priority ?? "none",
      estimateMin: spec.estimate ?? null,
      scheduledFor,
      dueDate: spec.due === undefined ? null : day(spec.due),
      plannedStartMin: spec.block?.[0] ?? null,
      plannedEndMin: spec.block?.[1] ?? null,
      completedAt: status === "done" ? instantAt(scheduledFor ?? today, "17:30", TZ) : null,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    };

    taskIds[spec.key] = task.id;
    db.tasks.set(task.id, task);

    for (const tagKey of spec.tags ?? []) {
      const tagId = tagIds[tagKey];
      if (tagId) db.taskTags.push({ taskId: task.id, tagId });
    }
  });

  // --- sessions ----------------------------------------------------------
  // Last week and this week, so analytics and the review page have real data.

  const sessionSpecs: [taskKey: string, dayOffset: number, from: string, to: string][] = [
    ["abstract", -3, "09:15", "10:20"],
    ["abstract", -3, "11:00", "11:40"],
    ["rust2", -2, "19:30", "20:35"],
    ["gym", -2, "07:00", "07:50"],
    ["consumers", -1, "09:30", "11:15"],
    ["consumers", -1, "13:00", "13:45"],
    ["seedbug", -1, "14:30", "16:10"],
    ["standup", 0, "09:00", "09:14"],
    ["ablations", 0, "09:20", "10:05"],
    ["chen", -4, "16:00", "16:35"],
    ["queue", -5, "10:00", "12:00"],
    ["rust2", -6, "20:00", "20:45"],
    ["abstract", -6, "10:30", "12:15"],
    ["walk", -7, "08:00", "08:30"],
  ];

  for (const [taskKey, dayOffset, from, to] of sessionSpecs) {
    const taskId = taskIds[taskKey];
    if (!taskId) continue;

    const task = db.tasks.get(taskId);
    if (!task) continue;

    const on = day(dayOffset);
    const startedAt = instantAt(on, from as `${number}:${number}`, TZ);
    const endedAt = instantAt(on, to as `${number}:${number}`, TZ);

    const session: TimeSession = {
      id: newId(),
      userId: DEV_USER_ID,
      taskId,
      // Captured at start — so moving the task later can't rewrite history.
      projectId: task.projectId,
      areaId: task.areaId,
      startedAt,
      endedAt,
      durationSec: elapsedSeconds(startedAt, endedAt),
      source: "timer",
      note: null,
      needsReview: false,
      createdAt: now,
      updatedAt: now,
    };
    db.sessions.set(session.id, session);
  }

  // One session left running overnight last week, flagged for review — the
  // "you forgot to stop the timer" case needs a real row to render against.
  const forgotten = taskIds["queue"];
  if (forgotten) {
    const on = addDays(weekStart, -3);
    const startedAt = instantAt(on, "14:00", TZ);
    const endedAt = instantAt(addDays(on, 1), "09:30", TZ);

    const id = newId();
    db.sessions.set(id, {
      id,
      userId: DEV_USER_ID,
      taskId: forgotten,
      projectId: db.tasks.get(forgotten)?.projectId ?? null,
      areaId: db.tasks.get(forgotten)?.areaId ?? null,
      startedAt,
      endedAt,
      durationSec: elapsedSeconds(startedAt, endedAt),
      source: "timer",
      note: null,
      needsReview: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}
