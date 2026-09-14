import { prisma } from "@lifedesk/db";

import type { Repos } from "../types";
import { createPrismaAreaRepo } from "./area";
import { createPrismaProjectRepo } from "./project";
import { createPrismaDayPlanRepo } from "./day-plan";
import { createPrismaSessionRepo } from "./session";
import { createPrismaSettingsRepo } from "./settings";
import { createPrismaTagRepo } from "./tag";
import { createPrismaTaskRepo } from "./task";

/**
 * The Phase 2 implementation, against the same interfaces as the memory one.
 *
 * `now` is injected rather than read from a clock, exactly as in the memory
 * repos, so both are testable at a fixed instant and neither can disagree with
 * `context.now()`.
 */
export function createPrismaRepos({ now }: { now: () => Date }): Repos {
  return {
    area: createPrismaAreaRepo(prisma, now),
    project: createPrismaProjectRepo(prisma, now),
    task: createPrismaTaskRepo(prisma, now),
    tag: createPrismaTagRepo(prisma),
    session: createPrismaSessionRepo(prisma, now),
    dayPlan: createPrismaDayPlanRepo(prisma),
    settings: createPrismaSettingsRepo(prisma, now),
  };
}
