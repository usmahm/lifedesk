---
name: add-feature
description: Build a complete vertical slice in LifeDesk — contract, repository, procedure, hook, UI, test. Use whenever adding a new entity or a new user-facing capability that needs data, so the layers get built in an order that keeps the Phase 2 backend swap free.
---

# Adding a feature

A feature in LifeDesk is a **vertical slice**: it cuts through every layer. Build it bottom-up. Building UI first and backfilling the data layer is how boundaries leak, and a leaked boundary costs you on swap day.

Read `.claude/rules/data-access.md` before starting. Check `docs/PLAN.md` §5.3 first — if the thing is listed as out of scope, stop and ask.

## Order

### 1. Contract — `packages/contracts/src/<entity>.ts`

The Zod schema is the source of truth. Types are inferred, never declared alongside.

```ts
export const taskSchema = z.object({ /* … */ });
export type Task = z.infer<typeof taskSchema>;

export const createTaskInput = taskSchema.pick({ title: true, projectId: true });
export const updateTaskInput = createTaskInput.partial().extend({ id: z.string() });
```

Separate input schemas from the entity schema — a create input is not a `Partial<Task>`, and conflating them lets clients set `id`, `userId`, or `createdAt`.

Zero dependencies beyond Zod. This package is imported by the client.

### 2. Repository interface — `packages/api/src/repos/types.ts`

**`userId` is the first parameter of every method.** That makes an ownership-free call impossible to write by accident.

```ts
export interface TaskRepo {
  findById(userId: string, id: string): Promise<Task | null>;
  findMany(userId: string, filters: TaskFilters, page: CursorPage): Promise<Page<Task>>;
  create(userId: string, input: CreateTaskInput): Promise<Task>;
  update(userId: string, id: string, input: UpdateTaskInput): Promise<Task | null>;
}
```

Keep it Prisma-shaped: filters as objects not callbacks, cursors not offsets. If a method would be trivial over a `Map` but a table scan in Postgres, the interface is wrong.

### 3. Memory implementation — `packages/api/src/repos/memory/<entity>.ts`

Back it with a module-level `Map`. Filter by `userId` in every method — mirroring the real constraint here is what proves the interface is sound.

Seed **realistic** fixtures in `repos/memory/fixtures.ts`: a project mid-flight, a week with some full days and some empty, last week's sessions so charts have data. Clean fixtures hide the layout problems the UI phase exists to find.

### 4. Procedure — `packages/api/src/routers/<entity>.ts`

Always from `protectedProcedure`. Always `.input()`. Always pass `ctx.userId` first.

```ts
export const taskRouter = {
  list: protectedProcedure
    .input(listTasksInput)
    .handler(({ input, context }) => context.repos.task.findMany(context.userId, input.filters, input.page)),
};
```

Return **not-found, never forbidden**, for another user's row — "forbidden" confirms the record exists.

No business logic here. Validation is the contract's job, domain rules belong in `packages/core`.

### 5. Domain logic — `packages/core/` *(if any)*

Anything computed rather than stored — capacity math, duration rounding, recurrence expansion, estimate accuracy. Pure functions, no I/O, time passed as an argument rather than read from a clock.

**Write the unit test here**, not later. This is the layer where tests are cheap and pay off most.

### 6. Hook — `apps/web/src/features/<feature>/hooks/use<Thing>.ts`

One hook per procedure. Query keys come from the oRPC helpers, never hand-written strings.

```ts
export function useTasks(filters: TaskFilters) {
  return useQuery(orpc.task.list.queryOptions({ input: { filters } }));
}
```

Mutations invalidate explicitly. Optimistic updates on anything that should feel instant — completing a task, starting the timer.

### 7. UI — `apps/web/src/features/<feature>/components/`

Read `.claude/rules/ui-components.md` and `.claude/rules/design-tokens.md`.

- One component per file, filename matching the export
- `constants.ts`, `types.ts` as separate colocated files
- **All four list states in the same change**: loading skeleton, error with retry, empty with one action, loaded
- **Mobile layout in the same change as desktop** — never a follow-up pass
- `"use client"` on the leaf-most component that needs it
- Export the public surface explicitly from the feature's `index.ts`

### 8. Verify

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Then in the browser at **390px and 1440px**, in **both themes**:

- Every state renders — including empty, which means clearing the fixtures for that list
- Nothing hover-only is unreachable on touch
- Numbers that change use `tabular-nums`
- Area colour appears only as a dot or a 3px edge
- `--focus` green appears only when a session is running

## Common mistakes

| Mistake | Why it bites |
|---|---|
| Mock data inside a component | Loading and error states become fiction; all of it gets written for the first time on swap day |
| `findById(id)` without `userId` | The exact shape of a real-world data leak |
| Business logic in the repository | Has to be rewritten when Prisma arrives |
| Desktop layout now, mobile later | Mobile-later means mobile-never |
| Types hand-declared beside a schema | They drift, and the compiler won't tell you |
| `new Date()` in a component | Hydration mismatch, wrong timezone, untestable |
