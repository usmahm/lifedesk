import { prisma } from "@lifedesk/db";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { DEFAULT_ONBOARDING_AREAS } from "./onboarding";

/**
 * Better Auth, replacing the Phase 1 cookie stub.
 *
 * Email and password only — no social providers, so the app runs with no OAuth
 * credentials. Adding Google later is a `socialProviders` block here plus a
 * button in the form; nothing downstream changes, because everything above
 * this file only ever sees `ctx.userId`.
 *
 * Exposed as a factory rather than a ready-made instance so the caller can add
 * host-specific plugins. `nextCookies()` has to be composed in by apps/web:
 * it reaches for `next/headers`, and this package stays framework-agnostic so
 * the same router can back a non-Next client later.
 *
 * It lives here rather than in the app because it needs the Prisma client, and
 * this is the only package allowed to touch it. See .claude/rules/data-access.md.
 */
export function createAuth(options?: { plugins?: BetterAuthOptions["plugins"] }) {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),

    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

    emailAndPassword: {
      enabled: true,
      // Nobody is sending email yet, so requiring verification would lock the
      // only user out of their own app. Turned on with the mail transport.
      requireEmailVerification: false,
      minPasswordLength: 8,
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        // Saves a database round trip on every request just to read the
        // session. Short enough that a sign-out still takes effect promptly.
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    databaseHooks: {
      user: {
        create: {
          /**
           * Onboarding, inside the transaction that creates the user.
           *
           * A new account with no areas is a dead end: every screen filters by
           * area, so the app would open on five empty states. Doing it here
           * rather than on first page load means it happens exactly once and
           * cannot be skipped by deep-linking past a welcome screen.
           */
          after: async (user) => {
            await prisma.$transaction([
              prisma.userSettings.create({ data: { userId: user.id } }),
              prisma.area.createMany({
                data: DEFAULT_ONBOARDING_AREAS.map((area, sortOrder) => ({
                  ...area,
                  userId: user.id,
                  sortOrder,
                })),
              }),
            ]);
          },
        },
      },
    },

    plugins: options?.plugins ?? [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
