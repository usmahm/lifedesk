import { getDayPlanInput, setIntentionInput } from "@lifedesk/contracts";

import { protectedProcedure } from "../orpc";

/**
 * The day's intention.
 *
 * `get` returns null rather than a not-found error: a day with nothing written
 * is the normal state, not a missing record, and making the client catch an
 * error for the common case would be backwards.
 */
export const dayPlanRouter = {
  get: protectedProcedure
    .input(getDayPlanInput)
    .handler(({ input, context }) => context.repos.dayPlan.get(context.userId, input.day)),

  setIntention: protectedProcedure
    .input(setIntentionInput)
    .handler(({ input, context }) =>
      context.repos.dayPlan.setIntention(context.userId, input.day, input.intention),
    ),
};
