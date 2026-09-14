import { asCalendarDay } from "@lifedesk/core/time";
import { call, isDefinedError, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "../clock";
import type { Context } from "../context";
import type { Repos } from "../repos/types";
import { appRouter } from "./index";

/**
 * The check that actually matters.
 *
 * `protectedProcedure` proves who is calling; it says nothing about what they
 * own. An authenticated user requesting someone else's row is where real apps
 * leak, so every router gets a test asserting it reads as absent — NOT_FOUND,
 * never FORBIDDEN, because "forbidden" confirms the record exists.
 */

const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";

export const NOW = new Date("2026-08-30T09:00:00Z");
export const OWNERSHIP_USERS = [USER_A, USER_B] as const;

let repos: Repos;

function ctx(userId: string): Context {
  return { userId, repos, now: fixedClock(NOW) };
}

/** Asserts a cross-user read is indistinguishable from a missing row. */
async function expectNotFound(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toSatisfy((error: unknown) => {
    expect(error).toBeInstanceOf(ORPCError);
    expect((error as ORPCError<string, unknown>).code).toBe("NOT_FOUND");
    return true;
  });
}

/**
 * The suite itself, run once per repository implementation.
 *
 * Memory and Prisma must be indistinguishable from above the storage boundary
 * — that is the whole claim the swap rests on, so it is asserted rather than
 * believed. `reset` is where the implementations genuinely differ: one builds
 * fresh maps, the other has to clear rows from a real database.
 */
export function runOwnershipSuite(options: {
  label: string;
  createRepos: () => Repos;
  reset?: () => Promise<void>;
}): void {
  describe(options.label, () => {
    beforeEach(async () => {
      await options.reset?.();
      repos = options.createRepos();
    });

    describe("unauthenticated access", () => {
      it("is rejected before any handler runs", async () => {
        const anonymous: Context = { userId: null, repos, now: fixedClock(NOW) };

        await expect(
          call(appRouter.task.list, { filters: {}, page: {} }, { context: anonymous }),
        ).rejects.toSatisfy((error: unknown) => {
          expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
          return true;
        });
      });
    });

    describe("areas", () => {
      it("hides another user's area", async () => {
        const area = await call(
          appRouter.area.create,
          { name: "Research", color: "indigo", icon: null },
          { context: ctx(USER_A) },
        );

        await expect(
          call(appRouter.area.get, { id: area.id }, { context: ctx(USER_A) }),
        ).resolves.toBeDefined();

        await expectNotFound(call(appRouter.area.get, { id: area.id }, { context: ctx(USER_B) }));
        await expectNotFound(
          call(appRouter.area.update, { id: area.id, name: "Hijacked" }, { context: ctx(USER_B) }),
        );
        await expectNotFound(
          call(
            appRouter.area.setArchived,
            { id: area.id, archived: true },
            { context: ctx(USER_B) },
          ),
        );
      });

      it("does not list another user's areas", async () => {
        await call(
          appRouter.area.create,
          { name: "Research", color: "indigo", icon: null },
          { context: ctx(USER_A) },
        );

        const listed = await call(
          appRouter.area.list,
          { includeArchived: true },
          { context: ctx(USER_B) },
        );

        expect(listed).toEqual([]);
      });
    });

    describe("projects", () => {
      it("hides another user's project", async () => {
        const project = await call(
          appRouter.project.create,
          { areaId: null, name: "Paper", description: null, startDate: null, dueDate: null },
          { context: ctx(USER_A) },
        );

        await expectNotFound(
          call(appRouter.project.get, { id: project.id }, { context: ctx(USER_B) }),
        );
        await expectNotFound(
          call(
            appRouter.project.update,
            { id: project.id, name: "Taken" },
            { context: ctx(USER_B) },
          ),
        );
        await expectNotFound(
          call(appRouter.project.remove, { id: project.id }, { context: ctx(USER_B) }),
        );

        // Still there for its owner — the refusal above deleted nothing.
        await expect(
          call(appRouter.project.get, { id: project.id }, { context: ctx(USER_A) }),
        ).resolves.toMatchObject({ id: project.id });
      });

      it("keeps tasks and sessions when their project is deleted", async () => {
        const project = await call(
          appRouter.project.create,
          { areaId: null, name: "Paper", description: null, startDate: null, dueDate: null },
          { context: ctx(USER_A) },
        );
        const task = await call(
          appRouter.task.create,
          { title: "Rerun ablations", projectId: project.id },
          { context: ctx(USER_A) },
        );
        const session = await call(
          appRouter.session.start,
          { taskId: task.id },
          { context: ctx(USER_A) },
        );
        await call(appRouter.session.stop, { id: session.id }, { context: ctx(USER_A) });

        await call(appRouter.project.remove, { id: project.id }, { context: ctx(USER_A) });

        // onDelete: SetNull on both relations. Deleting a project must not
        // delete the work inside it, nor erase hours already logged.
        const kept = await call(appRouter.task.get, { id: task.id }, { context: ctx(USER_A) });
        expect(kept.projectId).toBeNull();

        const sessions = await call(
          appRouter.session.list,
          { filters: {}, page: { limit: 10 } },
          { context: ctx(USER_A) },
        );
        expect(sessions.items.map((s) => s.id)).toContain(session.id);
        expect(sessions.items.find((s) => s.id === session.id)?.projectId).toBeNull();
      });

      it("refuses to attach a project to someone else's area", async () => {
        const area = await call(
          appRouter.area.create,
          { name: "Research", color: "indigo", icon: null },
          { context: ctx(USER_A) },
        );

        // Would otherwise create an orphan pointing at another user's row.
        await expectNotFound(
          call(
            appRouter.project.create,
            {
              areaId: area.id,
              name: "Sneaky",
              description: null,
              startDate: null,
              dueDate: null,
            },
            { context: ctx(USER_B) },
          ),
        );
      });
    });

    describe("tasks", () => {
      it("hides another user's task from every mutation", async () => {
        const task = await call(
          appRouter.task.create,
          { title: "Rerun ablations" },
          { context: ctx(USER_A) },
        );

        await expectNotFound(call(appRouter.task.get, { id: task.id }, { context: ctx(USER_B) }));
        await expectNotFound(
          call(appRouter.task.update, { id: task.id, title: "Taken" }, { context: ctx(USER_B) }),
        );
        await expectNotFound(
          call(
            appRouter.task.setComplete,
            { id: task.id, complete: true },
            { context: ctx(USER_B) },
          ),
        );
        await expectNotFound(
          call(
            appRouter.task.schedule,
            { id: task.id, scheduledFor: null },
            { context: ctx(USER_B) },
          ),
        );
        await expectNotFound(
          call(appRouter.task.remove, { id: task.id }, { context: ctx(USER_B) }),
        );

        // Still intact for its owner.
        await expect(
          call(appRouter.task.get, { id: task.id }, { context: ctx(USER_A) }),
        ).resolves.toMatchObject({ title: "Rerun ablations", status: "todo" });
      });

      it("hides another user's task from time blocking", async () => {
        const task = await call(
          appRouter.task.create,
          { title: "Mine", scheduledFor: asCalendarDay("2026-08-30") },
          { context: ctx(USER_A) },
        );

        await expectNotFound(
          call(
            appRouter.task.setPlannedTime,
            { id: task.id, plannedStartMin: 540, plannedEndMin: 720 },
            { context: ctx(USER_B) },
          ),
        );
      });

      it("refuses to block a task that has no day to draw it on", async () => {
        const task = await call(
          appRouter.task.create,
          { title: "Someday" },
          { context: ctx(USER_A) },
        );

        await expect(
          call(
            appRouter.task.setPlannedTime,
            { id: task.id, plannedStartMin: 540, plannedEndMin: 720 },
            { context: ctx(USER_A) },
          ),
        ).rejects.toSatisfy((error: unknown) => {
          expect((error as ORPCError<string, unknown>).code).toBe("BAD_REQUEST");
          return true;
        });
      });

      it("clears the block when the day is cleared, leaving no orphan", async () => {
        const task = await call(
          appRouter.task.create,
          {
            title: "Blocked",
            scheduledFor: asCalendarDay("2026-08-30"),
            plannedStartMin: 540,
            plannedEndMin: 720,
          },
          { context: ctx(USER_A) },
        );
        expect(task.plannedStartMin).toBe(540);

        const unscheduled = await call(
          appRouter.task.schedule,
          { id: task.id, scheduledFor: null },
          { context: ctx(USER_A) },
        );

        expect(unscheduled.plannedStartMin).toBeNull();
        expect(unscheduled.plannedEndMin).toBeNull();
      });

      it("does not leak another user's tasks through list filters", async () => {
        await call(appRouter.task.create, { title: "Private" }, { context: ctx(USER_A) });

        const page = await call(
          appRouter.task.list,
          { filters: { search: "Private" }, page: {} },
          { context: ctx(USER_B) },
        );

        expect(page.items).toEqual([]);
      });

      it("ignores tag ids belonging to another user", async () => {
        const task = await call(appRouter.task.create, { title: "Mine" }, { context: ctx(USER_A) });
        const foreignTag = await call(
          appRouter.tag.create,
          { name: "theirs", color: "rose" },
          { context: ctx(USER_B) },
        );

        const updated = await call(
          appRouter.task.setTags,
          { id: task.id, tagIds: [foreignTag.id] },
          { context: ctx(USER_A) },
        );

        expect(updated.tagIds).toEqual([]);
      });
    });

    describe("sessions", () => {
      it("hides another user's session", async () => {
        const task = await call(appRouter.task.create, { title: "Work" }, { context: ctx(USER_A) });
        const session = await call(
          appRouter.session.start,
          { taskId: task.id, source: "timer" },
          { context: ctx(USER_A) },
        );

        await expectNotFound(
          call(appRouter.session.stop, { id: session.id }, { context: ctx(USER_B) }),
        );
        await expectNotFound(
          call(appRouter.session.remove, { id: session.id }, { context: ctx(USER_B) }),
        );

        // B's own running session is unaffected by A's.
        const running = await call(appRouter.session.running, undefined, { context: ctx(USER_B) });
        expect(running.session).toBeNull();
      });

      it("refuses to start a session against someone else's task", async () => {
        const task = await call(
          appRouter.task.create,
          { title: "Private" },
          { context: ctx(USER_A) },
        );

        await expectNotFound(
          call(
            appRouter.session.start,
            { taskId: task.id, source: "timer" },
            { context: ctx(USER_B) },
          ),
        );
      });
    });

    describe("day plans", () => {
      const DAY = "2026-09-14" as const;

      it("gives each user their own intention for the same day", async () => {
        await call(
          appRouter.dayPlan.setIntention,
          { day: DAY, intention: "Finish the ablations" },
          { context: ctx(USER_A) },
        );

        // Same key, different owner — the composite primary key is (userId, day),
        // so this would collide if the row were keyed by day alone.
        await expect(
          call(appRouter.dayPlan.get, { day: DAY }, { context: ctx(USER_B) }),
        ).resolves.toBeNull();

        await call(
          appRouter.dayPlan.setIntention,
          { day: DAY, intention: "Theirs" },
          { context: ctx(USER_B) },
        );

        await expect(
          call(appRouter.dayPlan.get, { day: DAY }, { context: ctx(USER_A) }),
        ).resolves.toMatchObject({ intention: "Finish the ablations" });
      });

      it("distinguishes never set from cleared", async () => {
        await expect(
          call(appRouter.dayPlan.get, { day: "2026-09-15" }, { context: ctx(USER_A) }),
        ).resolves.toBeNull();

        await call(
          appRouter.dayPlan.setIntention,
          { day: "2026-09-15", intention: "Something" },
          { context: ctx(USER_A) },
        );

        // Blank after trimming removes the row rather than storing "", so a
        // cleared day reads the same as one never written.
        await expect(
          call(
            appRouter.dayPlan.setIntention,
            { day: "2026-09-15", intention: "   " },
            { context: ctx(USER_A) },
          ),
        ).resolves.toBeNull();

        await expect(
          call(appRouter.dayPlan.get, { day: "2026-09-15" }, { context: ctx(USER_A) }),
        ).resolves.toBeNull();
      });
    });

    describe("settings", () => {
      it("gives each user their own row", async () => {
        await call(appRouter.settings.update, { dailyCapacityMin: 480 }, { context: ctx(USER_A) });

        const a = await call(appRouter.settings.get, undefined, { context: ctx(USER_A) });
        const b = await call(appRouter.settings.get, undefined, { context: ctx(USER_B) });

        expect(a.dailyCapacityMin).toBe(480);
        expect(b.dailyCapacityMin).toBe(360);
        expect(b.userId).toBe(USER_B);
      });
    });

    describe("error shape", () => {
      it("reports NOT_FOUND rather than FORBIDDEN, so existence is not confirmed", async () => {
        const task = await call(
          appRouter.task.create,
          { title: "Secret" },
          { context: ctx(USER_A) },
        );

        const missingId = "00000000-0000-4000-8000-0000000000ff";

        const foreign = await call(
          appRouter.task.get,
          { id: task.id },
          { context: ctx(USER_B) },
        ).catch((e: unknown) => e);
        const missing = await call(
          appRouter.task.get,
          { id: missingId },
          { context: ctx(USER_B) },
        ).catch((e: unknown) => e);

        // A row that exists but isn't yours must be indistinguishable from one
        // that doesn't exist at all.
        expect(isDefinedError(foreign) || foreign instanceof ORPCError).toBe(true);
        expect((foreign as ORPCError<string, unknown>).code).toBe(
          (missing as ORPCError<string, unknown>).code,
        );
        expect((foreign as ORPCError<string, unknown>).message).toBe(
          (missing as ORPCError<string, unknown>).message,
        );
      });
    });
  });
}
