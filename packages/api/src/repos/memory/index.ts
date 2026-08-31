import type { Repos } from "../types";
import { createMemoryAreaRepo } from "./area";
import { seedFixtures } from "./fixtures";
import { createMemoryProjectRepo } from "./project";
import { createMemorySessionRepo } from "./session";
import { createMemorySettingsRepo } from "./settings";
import { createMemoryTagRepo } from "./tag";
import { createMemoryTaskRepo } from "./task";
import { createDb, type MemoryDb } from "./store";

export { DEV_USER, DEV_USER_ID } from "./fixtures";
export { createDb, type MemoryDb } from "./store";

export type MemoryRepos = Repos & { db: MemoryDb };

export function createMemoryRepos(options: { now: () => Date; seed?: boolean }): MemoryRepos {
  const db = createDb();
  const { now } = options;

  if (options.seed !== false) {
    seedFixtures(db, now());
  }

  return {
    db,
    area: createMemoryAreaRepo(db, now),
    project: createMemoryProjectRepo(db, now),
    task: createMemoryTaskRepo(db, now),
    tag: createMemoryTagRepo(db, now),
    session: createMemorySessionRepo(db, now),
    settings: createMemorySettingsRepo(db, now),
  };
}
