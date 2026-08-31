import type {
  Area,
  CalendarDay,
  CreateAreaInput,
  CreateProjectInput,
  CreateTagInput,
  CreateTaskInput,
  ListAreasInput,
  ListProjectsInput,
  ListSessionsInput,
  Page,
  Project,
  ResolvedCursorPage,
  SessionSource,
  Tag,
  TaskFilters,
  TaskWithMeta,
  TimeSession,
  UpdateAreaInput,
  UpdateProjectInput,
  UpdateSettingsInput,
  UpdateTagInput,
  UpdateTaskInput,
  UserSettings,
} from "@lifedesk/contracts";
import type { CapacityInput } from "@lifedesk/core/capacity";

/**
 * The storage boundary.
 *
 * Phase 1 is backed by in-memory maps; Phase 2 swaps in Prisma against these
 * exact signatures. If the frontend has to change on swap day, something here
 * leaked. See .claude/rules/data-access.md.
 *
 * Two rules hold this together:
 *
 *   1. `userId` is the FIRST parameter of every method. That makes an
 *      ownership-free call impossible to write by accident — a type signature
 *      catches what a code review won't.
 *
 *   2. Signatures stay Prisma-shaped: object filters, cursor pagination, no
 *      callbacks. If something would be trivial over a Map but a table scan
 *      in Postgres, the interface is wrong.
 *
 * Repositories read and write. They contain no business logic, no
 * authorization decisions, and no formatting.
 */

/** Absent rows return null rather than throwing — the procedure decides. */
export interface AreaRepo {
  list(userId: string, input: ListAreasInput): Promise<Area[]>;
  findById(userId: string, id: string): Promise<Area | null>;
  create(userId: string, input: CreateAreaInput): Promise<Area>;
  update(userId: string, input: UpdateAreaInput): Promise<Area | null>;
  setArchived(userId: string, id: string, archived: boolean): Promise<Area | null>;
}

export interface ProjectRepo {
  list(userId: string, input: ListProjectsInput): Promise<Project[]>;
  findById(userId: string, id: string): Promise<Project | null>;
  create(userId: string, input: CreateProjectInput): Promise<Project>;
  update(userId: string, input: UpdateProjectInput): Promise<Project | null>;
  setArchived(userId: string, id: string, archived: boolean): Promise<Project | null>;
}

export interface TaskRepo {
  list(
    userId: string,
    filters: TaskFilters,
    page: ResolvedCursorPage,
  ): Promise<Page<TaskWithMeta>>;
  findById(userId: string, id: string): Promise<TaskWithMeta | null>;
  create(userId: string, input: CreateTaskInput): Promise<TaskWithMeta>;
  update(userId: string, input: UpdateTaskInput): Promise<TaskWithMeta | null>;
  remove(userId: string, id: string): Promise<boolean>;
  setTags(userId: string, id: string, tagIds: string[]): Promise<TaskWithMeta | null>;

  /**
   * Estimates and statuses for one day, unpaginated.
   *
   * Deliberately not `list()` — the capacity meter needs every task for the
   * day, and in SQL this is a narrow indexed read on `(userId, scheduledFor)`.
   */
  capacityInputsForDay(userId: string, day: CalendarDay): Promise<CapacityInput[]>;
}

export interface TagRepo {
  list(userId: string): Promise<Tag[]>;
  findById(userId: string, id: string): Promise<Tag | null>;
  create(userId: string, input: CreateTagInput): Promise<Tag>;
  update(userId: string, input: UpdateTagInput): Promise<Tag | null>;
  remove(userId: string, id: string): Promise<boolean>;
}

/**
 * Area and project ids are resolved by the procedure and passed in, so the
 * repository stays dumb. They're denormalized onto the session on purpose:
 * move a task to another project later and last month's report must not
 * silently rewrite itself.
 */
export type StartSessionPayload = {
  taskId: string | null;
  projectId: string | null;
  areaId: string | null;
  source: SessionSource;
  startedAt: Date;
};

export type CreateSessionPayload = StartSessionPayload & {
  endedAt: Date;
  note: string | null;
  needsReview: boolean;
};

export interface SessionRepo {
  /**
   * The single running session, if any.
   *
   * At most one per user — Phase 2 enforces it with a partial unique index on
   * `(userId) WHERE endedAt IS NULL` so the database guarantees it rather than
   * the application hoping.
   */
  running(userId: string): Promise<TimeSession | null>;
  list(
    userId: string,
    filters: ListSessionsInput["filters"],
    page: ResolvedCursorPage,
    /** Day filters are resolved to a UTC instant range by the procedure. */
    range: { start: Date; end: Date } | null,
  ): Promise<Page<TimeSession>>;
  findById(userId: string, id: string): Promise<TimeSession | null>;
  start(userId: string, payload: StartSessionPayload): Promise<TimeSession>;
  stop(
    userId: string,
    id: string,
    endedAt: Date,
    note: string | null,
    needsReview: boolean,
  ): Promise<TimeSession | null>;
  create(userId: string, payload: CreateSessionPayload): Promise<TimeSession>;
  update(
    userId: string,
    input: UpdateTaskSessionPatch,
  ): Promise<TimeSession | null>;
  remove(userId: string, id: string): Promise<boolean>;
  /** Total tracked seconds within a UTC instant range. */
  totalSecondsInRange(userId: string, range: { start: Date; end: Date }): Promise<number>;
}

export type UpdateTaskSessionPatch = {
  id: string;
  taskId?: string | null;
  projectId?: string | null;
  areaId?: string | null;
  startedAt?: Date;
  endedAt?: Date;
  note?: string | null;
  needsReview?: boolean;
};

export interface SettingsRepo {
  /** Creates defaults on first read, so callers never handle a missing row. */
  get(userId: string): Promise<UserSettings>;
  update(userId: string, input: UpdateSettingsInput): Promise<UserSettings>;
}

export interface Repos {
  area: AreaRepo;
  project: ProjectRepo;
  task: TaskRepo;
  tag: TagRepo;
  session: SessionRepo;
  settings: SettingsRepo;
}
