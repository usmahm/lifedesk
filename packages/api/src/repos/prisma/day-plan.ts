import type { PrismaClient } from "@lifedesk/db";

import type { DayPlanRepo } from "../types";

export function createPrismaDayPlanRepo(prisma: PrismaClient): DayPlanRepo {
  return {
    async get(userId, day) {
      const row = await prisma.dayPlan.findUnique({
        where: { userId_day: { userId, day } },
      });
      return row ? { userId: row.userId, day, intention: row.intention } : null;
    },

    async setIntention(userId, day, intention) {
      const trimmed = intention?.trim() ?? "";

      // Clearing deletes the row rather than storing "". An empty row would
      // make "never set" and "cleared" indistinguishable on read — which is
      // the difference between a placeholder and a blank line.
      if (trimmed === "") {
        await prisma.dayPlan.deleteMany({ where: { userId, day } });
        return null;
      }

      // Upsert, not find-then-write: two tabs saving the same day would race
      // and one would fail on the composite primary key.
      const row = await prisma.dayPlan.upsert({
        where: { userId_day: { userId, day } },
        create: { userId, day, intention: trimmed },
        update: { intention: trimmed },
      });

      return { userId: row.userId, day, intention: row.intention };
    },
  };
}
