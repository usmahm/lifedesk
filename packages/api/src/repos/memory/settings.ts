import { DEFAULT_SETTINGS, type UserSettings } from "@lifedesk/contracts";

import type { SettingsRepo } from "../types";
import type { MemoryDb } from "./store";

export function createMemorySettingsRepo(db: MemoryDb, now: () => Date): SettingsRepo {
  return {
    async get(userId) {
      const existing = db.settings.get(userId);
      if (existing) return existing;

      // Created on first read, so no caller ever handles a missing row.
      const created: UserSettings = { ...DEFAULT_SETTINGS, userId, updatedAt: now() };
      db.settings.set(userId, created);
      return created;
    },

    async update(userId, input) {
      const existing = db.settings.get(userId) ?? {
        ...DEFAULT_SETTINGS,
        userId,
        updatedAt: now(),
      };

      const updated: UserSettings = { ...existing, ...input, userId, updatedAt: now() };
      db.settings.set(userId, updated);
      return updated;
    },
  };
}
