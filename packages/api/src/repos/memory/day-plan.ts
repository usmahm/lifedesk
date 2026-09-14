import type { CalendarDay, DayPlan } from "@lifedesk/contracts";

import type { DayPlanRepo } from "../types";
import type { MemoryDb } from "./store";

/** `userId` and `day` together are the key — see DayPlanRepo. */
function keyOf(userId: string, day: CalendarDay): string {
  return `${userId}:${day}`;
}

export function createMemoryDayPlanRepo(db: MemoryDb): DayPlanRepo {
  return {
    async get(userId, day) {
      return db.dayPlans.get(keyOf(userId, day)) ?? null;
    },

    async setIntention(userId, day, intention) {
      const trimmed = intention?.trim() ?? "";

      // Clearing removes the row rather than storing "". Keeping an empty row
      // would make "never set" and "cleared" indistinguishable on read, which
      // is the difference between a placeholder and a blank line.
      if (trimmed === "") {
        db.dayPlans.delete(keyOf(userId, day));
        return null;
      }

      const plan: DayPlan = { userId, day, intention: trimmed };
      db.dayPlans.set(keyOf(userId, day), plan);
      return plan;
    },
  };
}
