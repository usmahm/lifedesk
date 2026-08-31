import { areaRouter } from "./area";
import { projectRouter } from "./project";
import { sessionRouter } from "./session";
import { settingsRouter } from "./settings";
import { tagRouter } from "./tag";
import { taskRouter } from "./task";

/**
 * The public router — everything reachable over HTTP.
 *
 * Anything that must NOT be callable from a browser (maintenance, cron, admin)
 * goes in a separate router that is never mounted on the route handler. That
 * is the one tier a browser genuinely cannot touch. See docs/PLAN.md §6.2.
 */
export const appRouter = {
  settings: settingsRouter,
  area: areaRouter,
  project: projectRouter,
  task: taskRouter,
  tag: tagRouter,
  session: sessionRouter,
};

export type AppRouter = typeof appRouter;
