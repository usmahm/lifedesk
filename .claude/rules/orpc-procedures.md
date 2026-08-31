# oRPC procedures

How the API layer is built here, against the code that exists. Companion to `.claude/rules/data-access.md`, which covers the boundaries.

**Pinned to oRPC v1 (1.15.0).** v2 is beta — do not use it or copy v2 docs.

## The builders

`packages/api/src/orpc.ts` defines two, and there are no others:

```ts
const base = os.$context<Context>();

const requireUser = base.middleware(({ context, next }) => {
  if (!context.userId) throw new ORPCError("UNAUTHORIZED", { message: "Sign in to continue." });
  return next({ context: { ...context, userId: context.userId } satisfies AuthedContext });
});

export const publicProcedure = base;          // sign-in, health. Nothing else.
export const protectedProcedure = base.use(requireUser);
```

The split is the point: `Context.userId` is `string | null`, `AuthedContext.userId` is `string`. No procedure can reach a repository without a user attached, because the repositories demand one.

## Shape of a procedure

```ts
export const taskRouter = {
  list: protectedProcedure
    .input(listTasksInput)
    .handler(({ input, context }) =>
      context.repos.task.list(context.userId, input.filters, input.page),
    ),

  get: protectedProcedure
    .input(z.object({ id: idSchema }))
    .handler(async ({ input, context }) => {
      const task = await context.repos.task.findById(context.userId, input.id);
      return task ?? notFound("Task");
    }),
};
```

- Input schemas come from `@lifedesk/contracts`. Inline `z.object` only for trivial `{ id }` arguments.
- A repository returning `null` becomes `notFound()`. Repositories never throw; procedures decide.
- Routers are plain objects. `appRouter` in `routers/index.ts` composes them; `AppRouter` is the type the client imports.

## Rules that are not negotiable

1. **`protectedProcedure` always.**
2. **`.input()` always.**
3. **`context.userId` is the first argument to every repository call**, and never comes from input.
4. **`notFound()`, never a forbidden error.** Confirming a record exists is itself a leak. `ownership.test.ts` asserts the foreign-row error is byte-identical to the missing-row error.
5. **No business logic in the handler.** Validate in the contract, compute in `@lifedesk/core`, store in the repository.

## Cross-entity ownership

Referencing another entity means checking it belongs to the caller first:

```ts
if (input.areaId) {
  const area = await context.repos.area.findById(context.userId, input.areaId);
  if (!area) notFound("Area");
}
```

Without this you can create a project pointing at someone else's area. `project.create` and `session.start` both do it.

## Time

Procedures own the conversion between calendar days and instants, because only they can read the user's timezone:

```ts
const settings = await context.repos.settings.get(context.userId);
const range = calendarDayRange(input.day, settings.timezone);
```

Repositories receive UTC instant ranges, never calendar days plus a zone. `session.list` and `session.totalForToday` are the references.

`context.now()` is the clock — injected, never `new Date()` in a handler, so procedures are testable at a fixed instant.

## Server-only procedures

Anything a browser must never call goes in a **separate router that is not mounted on the HTTP handler** in `apps/web/src/app/rpc/[[...rest]]/route.ts`. Reachable through the server-side client from RSC, and nowhere else. That is the only genuinely unreachable tier — everything in `appRouter` is public by definition.

## Testing

`packages/api/src/routers/ownership.test.ts` invokes procedures directly:

```ts
await call(appRouter.task.get, { id }, { context: ctx(USER_B) });
```

Add an ownership case for every new router. Use `createTestRepos({ now: fixedClock(NOW), seed: false })` so tests share no state.
