import { DEFAULT_SETTINGS } from "@lifedesk/contracts";
import type { PrismaClient } from "@lifedesk/db";

import type { SettingsRepo } from "../types";
import { toSettings } from "./map";

export function createPrismaSettingsRepo(prisma: PrismaClient, now: () => Date): SettingsRepo {
  return {
    async get(userId) {
      // Created on first read, so no caller ever handles a missing row. An
      // upsert rather than find-then-create: two parallel requests for a new
      // user would otherwise race, and one would fail on the primary key.
      const row = await prisma.userSettings.upsert({
        where: { userId },
        create: { userId, ...DEFAULT_SETTINGS },
        update: {},
      });
      return toSettings(row);
    },

    async update(userId, input) {
      const row = await prisma.userSettings.upsert({
        where: { userId },
        create: { userId, ...DEFAULT_SETTINGS, ...input },
        update: { ...input, updatedAt: now() },
      });
      return toSettings(row);
    },
  };
}
