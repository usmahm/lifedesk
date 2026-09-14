# Deploying LifeDesk

Vercel + Neon. The repo is ready; this is the part that needs your accounts.

`docs/PLAN.md` is the source of truth for everything else.

---

## 1. Environment variables

Four, set for **Production** and **Preview**.

| Variable             | Value                               | Notes                                                           |
| -------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`       | Neon **pooled** connection string   | Hostname contains `-pooler`. This is what the running app uses. |
| `DIRECT_URL`         | Neon **unpooled** connection string | No `-pooler`. Migrations only — the pooler cannot run DDL.      |
| `BETTER_AUTH_SECRET` | 32+ random characters               | `openssl rand -base64 32`. **Rotating it signs everyone out.**  |
| `BETTER_AUTH_URL`    | The deployment's real origin        | e.g. `https://lifedesk.vercel.app`. No trailing slash.          |

`BETTER_AUTH_URL` is not optional in production — the app throws on boot without it. That is deliberate: it is the origin cookies and callbacks are built against, and a wrong value produces no error at all, just sign-in failing days later for no visible reason.

Preview deployments get a different generated URL each time. Either set `BETTER_AUTH_URL` per-deployment or accept that auth only works properly on production; the alternative is trusting a wildcard origin, which is worse.

---

## 2. Vercel project settings

| Setting                              | Value                           |
| ------------------------------------ | ------------------------------- |
| Root Directory                       | `apps/web`                      |
| Include files outside root directory | **on** — it is a pnpm workspace |
| Framework preset                     | Next.js (auto-detected)         |
| Build command                        | default (`next build`)          |
| Install command                      | default (`pnpm install`)        |

Nothing custom is needed for Prisma, but **not** because of the `postinstall`. `packages/db` has a `build` script that runs `prisma generate`, and `@lifedesk/web#build` reaches it through `^build`, so the client is produced as part of the build graph.

This was originally left to `postinstall` alone, and that is a trap worth recording. The generated client is gitignored, so it has to be produced on the build machine — but once Vercel restores a build cache, `pnpm install` reports `Already up to date` in under a second and **skips lifecycle scripts entirely**. Generation never runs, and the build fails with `Can't resolve './generated/client'`. It only ever worked on a cold cache.

`prisma generate` needs no database URL (verified), so nothing here can be blocked by a missing environment variable, and Turbo caches the output keyed on `prisma/schema.prisma` rather than on connection strings.

`typecheck`, `lint` and `test` also depend on `^build` for the same reason — all three need the generated client, and none of them should rely on an install having happened.

The `postinstall` stays as a convenience for a fresh clone. It is no longer load-bearing.

---

## 3. Migrations

**Migrations do not run during the build, on purpose.**

Preview deployments read the same `DATABASE_URL` as production, so wiring `migrate deploy` into the build would let any feature branch migrate the production database the moment it was pushed. Run it deliberately instead:

```bash
pnpm db:deploy     # prisma migrate deploy, against DIRECT_URL
```

Run it **before** deploying a change that adds or alters a table, so the new code never meets an old schema.

The proper fix later is a Neon branch per preview deployment, which makes auto-migration safe. Not set up.

---

## 4. First deploy

1. Push to GitHub
2. Vercel → **Add New Project** → import the repo
3. Set Root Directory to `apps/web` and enable "include files outside root"
4. Paste the four environment variables
5. `pnpm db:deploy` locally, so the schema is current
6. Deploy
7. Open the deployment, sign up, confirm you land on `/today` with five default areas

To carry the demo fixtures over, after signing up:

```bash
SEED_EMAIL=you@example.com pnpm --filter @lifedesk/db seed
```

That replaces the account's planning data. It does not touch the account itself, so you stay signed in.

---

## 5. What is protecting the deployment

- **Rate limiting** on `/api/auth/*`, counters in Postgres. 3 sign-in, sign-up, or password-change attempts per 10 seconds per IP; over that is a `429` with `X-Retry-After`. The limit is on the endpoint, not on failures — a correct password during a lockout is still refused, which is what makes it effective against credential stuffing.
- **`/rpc` is not rate limited.** Every procedure is behind `protectedProcedure`, unauthenticated calls are rejected before a handler runs, and each query filters by `userId`. Adding a counter there would put a database write on every request to defend against an attacker who first has to create an account. Vercel's firewall can cap it without code if it ever becomes a problem.
- **Ownership is checked in the query**, not after it. A row belonging to another user is indistinguishable from one that does not exist.

### Rate limiting depends on `x-forwarded-for`

Better Auth resolves the client IP from that header, and Vercel sets it. If it ever cannot resolve an IP it falls back to **a single shared bucket per path** — one counter for every user at once. It fails quietly and in the wrong direction, so if sign-in starts returning `429` for unrelated people, check that header first.

---

## 6. When something breaks

There is no Sentry. Vercel's runtime logs are the whole diagnostic story.

Unexpected server errors are logged as `[rpc] unhandled error` with the procedure path, the HTTP method, and the error name and message. Expected outcomes — `NOT_FOUND`, `UNAUTHORIZED` — are **not** logged: they happen constantly and would bury the line that matters.

Request bodies are never logged. They carry task titles and notes.

Server source maps are enabled, so a stack trace names real files instead of bundled offsets. Browser source maps are off — they would ship the client source to anyone who opens devtools for no diagnostic gain.

If the logs prove too thin, Sentry is the next step; it was deliberately skipped rather than forgotten.
