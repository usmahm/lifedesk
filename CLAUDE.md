# LifeDesk

Personal planning and time-tracking app. Plan the month, week, and day; track time against tasks; see where the hours actually went versus where you said they'd go.

> **`docs/PLAN.md` is the source of truth** for product decisions, the design system, architecture, and the roadmap. Read it before proposing anything structural. If code and that document disagree, one of them is a bug — fix both in the same change.

**Current phase: 1 — functional UI on mock data.** There is no database yet. `packages/api` serves real oRPC procedures backed by in-memory repositories. Prisma and Better Auth land in Phase 2 and must not be added early.

## Stack

Versions are pinned in the pnpm catalog in `pnpm-workspace.yaml`. **Do not bump anything without asking.**

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui · oRPC v1 · TanStack Query v5 · Zod v4 · date-fns · pnpm workspaces + Turborepo

Phase 2 will add: Prisma 7.10.0 (not 8 — see `docs/PLAN.md` §6.1) · Neon Postgres · Better Auth.

## Commands

```bash
pnpm dev          # all packages in watch mode
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

Always run `pnpm typecheck && pnpm lint` before calling a change done.

## Layout

```
apps/web           Next.js. UI only — never imports Prisma or a repository.
packages/ui        shadcn components, design tokens, Tailwind preset.
packages/contracts Zod schemas + inferred types. Zero deps. Safe on the client.
packages/api       oRPC routers, auth middleware, repositories (memory now, Prisma later).
packages/core      Pure domain logic: time math, capacity, recurrence. No I/O.
tooling/*          Shared eslint / typescript / tailwind config.
```

Dependency direction is one-way: `web → api → repos`, with `contracts` and `core` importable by anyone. Nothing ever imports `web`.

## Hard rules

1. **One component per file**, filename matches the export.
2. **`constants.ts`, `types.ts`, `utils.ts` are separate colocated files** — never inlined at the top of a component.
3. **No `any`.** No `@ts-expect-error` without a comment saying why and what would remove it.
4. **`apps/web` never touches a repository or Prisma.** It calls oRPC. Enforced by lint.
5. **Every procedure filters by `ctx.userId`.** Authentication is not authorization.
6. **Never `new Date()` in a component.** All date work goes through `packages/core/time`.
7. **`--focus` green means "a session is running"** and nothing else. Never a success state.
8. **Named exports only**, except where Next.js requires a default (`page.tsx`, `layout.tsx`, `route.ts`).

## Rules index

Read the relevant file before working in that area:

| Working on | Read |
|---|---|
| Any new file, or moving code around | `.claude/rules/file-organization.md` |
| Colours, spacing, type, motion | `.claude/rules/design-tokens.md` |
| Anything with a date, time, or duration | `.claude/rules/dates-and-timezones.md` |
| Repositories, procedures, data flow | `.claude/rules/data-access.md` |
| Components, shadcn, responsive layout | `.claude/rules/ui-components.md` |

## Boundaries

**Always**
- Build the mobile layout in the same change as the desktop one — never as a follow-up pass
- Add the empty state when you add a list
- Put shared domain logic in `packages/core` with a unit test

**Ask first**
- Adding a dependency, or changing a pinned version
- Changing the data model in `docs/PLAN.md` §7
- Introducing a new top-level package
- Anything the plan lists as out of scope (`docs/PLAN.md` §5.3)

**Never**
- Add drag-and-drop in Phase 1 — deferred deliberately, `sortOrder` already exists for it
- Add Prisma, a real database, or Better Auth before Phase 2
- Mock data inside a component — mocks live behind the repository interface only
- Commit or push unless asked
