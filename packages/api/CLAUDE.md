# packages/api

oRPC procedures, auth middleware, and the storage boundary. **The only package that may ever import Prisma** — and only inside `src/repos/prisma/` (Phase 2).

Read `.claude/rules/data-access.md` before changing anything here.

## Layout

```
src/orpc.ts          publicProcedure, protectedProcedure, notFound()
src/context.ts       Context (userId nullable) → AuthedContext (userId set)
src/clock.ts         the server clock — the only place here allowed `new Date()`
src/routers/*.ts     one file per entity; src/routers/index.ts is appRouter
src/repos/types.ts   the storage interfaces
src/repos/memory/    Phase 1 implementation + fixtures
src/repos/index.ts   the factory — the single place storage is chosen
```

## Writing a procedure

```ts
get: protectedProcedure
  .input(z.object({ id: idSchema }))
  .handler(async ({ input, context }) => {
    const task = await context.repos.task.findById(context.userId, input.id);
    return task ?? notFound("Task");
  }),
```

Non-negotiable:

1. **`protectedProcedure`**, always. `publicProcedure` is for sign-in and health only.
2. **`.input()` with a schema from `@lifedesk/contracts`.** A procedure without input validation is not finished.
3. **`context.userId` first** in every repository call. Never take a `userId` from input.
4. **`notFound()`, never forbidden.** A row belonging to someone else must be indistinguishable from one that doesn't exist — "forbidden" confirms it exists.
5. **No business logic.** Validation is the contract's job; domain rules live in `@lifedesk/core`.

Cross-entity ownership is checked explicitly: `project.create` verifies the area belongs to the caller before attaching, or you get an orphan pointing at someone else's row. See `src/routers/project.ts`.

## Where logic goes

| Concern | Home |
|---|---|
| Shape and validation | `@lifedesk/contracts` |
| Time, capacity, recurrence | `@lifedesk/core` |
| Authorization, orchestration | the procedure |
| Reads and writes | the repository |

Capacity is computed in `task.capacityForDay` rather than the client, because "time is shown, never calculated" is a design principle, not a preference.

Calendar days are resolved to UTC instant ranges **in the procedure** (`session.list`), so storage never has to guess a timezone.

## Repositories

`userId` is the first parameter of every method — that makes an ownership-free call impossible to write by accident.

Keep signatures **Prisma-shaped**: object filters, cursor pagination, no callbacks. If a method would be trivial over a `Map` but a table scan in Postgres, fix the interface, not the memory implementation.

Denormalized `areaId`/`projectId` on `TimeSession` are captured at session start on purpose — moving a task later must not rewrite last month's report.

## Tests

`src/routers/ownership.test.ts` asserts cross-user access fails for every router. **Add a case there whenever you add a router.** Build isolated state with `createTestRepos({ now: fixedClock(...), seed: false })`.

When the Prisma repos land, these same tests must pass against both implementations — that is what proves they're interchangeable.
