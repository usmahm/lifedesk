import { updateSettingsInput } from "@lifedesk/contracts";
import { todayIn } from "@lifedesk/core/time";

import { protectedProcedure } from "../orpc";

export const settingsRouter = {
  get: protectedProcedure.handler(({ context }) => context.repos.settings.get(context.userId)),

  update: protectedProcedure
    .input(updateSettingsInput)
    .handler(({ input, context }) => context.repos.settings.update(context.userId, input)),

  /**
   * Today, resolved in the user's stored timezone.
   *
   * The client must never compute this from its own clock: the browser's zone
   * is not necessarily the user's, and a mismatch shows tasks on the wrong day.
   */
  today: protectedProcedure.handler(async ({ context }) => {
    const settings = await context.repos.settings.get(context.userId);

    return {
      day: todayIn(settings.timezone, context.now()),
      timezone: settings.timezone,
      weekStartsOn: settings.weekStartsOn,
      serverNow: context.now(),
    };
  }),
};
