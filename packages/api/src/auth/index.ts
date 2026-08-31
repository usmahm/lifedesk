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
/**
 * The origin Better Auth builds callbacks and cookies against.
 *
 * Deliberately throws in production rather than falling back. A wrong baseURL
 * produces no error at all — it surfaces days later as sign-in mysteriously
 * failing, because cookies were scoped to a host nobody is visiting.
 */
function resolveBaseUrl(): string {
  const configured = process.env.BETTER_AUTH_URL;
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_URL must be set in production — it is the origin cookies and " +
        "callbacks are built against. See docs/DEPLOY.md.",
    );
  }
  return "http://localhost:3000";
}

export function createAuth(options?: { plugins?: BetterAuthOptions["plugins"] }) {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),

    baseURL: resolveBaseUrl(),

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

    /**
     * Counters live in Postgres, not memory — see the RateLimit model for why
     * the default `Map` is useless on serverless.
     *
     * `enabled` is forced on; Better Auth only enables it in production by
     * default, which means the one thing you want to test is the one thing
     * that never runs locally.
     *
     * The defaults do the rest: /sign-in*, /sign-up*, /change-password* and
     * /change-email* are capped at 3 per 10s per IP, password-reset paths at
     * 3 per 60s. Over the cap is a 429 with X-Retry-After. Note the window
     * resets from the *last* request, not the first, so hammering keeps it
     * alive — you have to go quiet to get back in.
     */
    rateLimit: {
      enabled: true,
      storage: "database",
    },

    advanced: {
      ipAddress: {
        /**
         * Not optional behind a proxy. Better Auth warns that when it cannot
         * resolve a client IP it "falls back to a single shared per-path
         * bucket" — one counter for every user on earth. On Vercel the real
         * address only arrives in x-forwarded-for, so without this the limiter
         * degrades silently, and in the wrong direction.
         */
        ipAddressHeaders: ["x-forwarded-for"],
      },
    },

    plugins: options?.plugins ?? [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
