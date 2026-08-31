# Data access

How data moves through the app, and the boundaries that keep the Phase 2 backend swap free.

## The layers

```
apps/web            React. Calls oRPC through TanStack Query hooks.
   │                Knows nothing about storage.
   ▼
packages/api        oRPC procedures. Auth middleware, Zod validation,
   │                authorization. Calls repositories.
   ▼
repos/ (interface)  TaskRepo, AreaRepo, SessionRepo, …
   ├─ memory/       Phase 1 — module-level maps + fixtures
   └─ prisma/       Phase 2 — same interface, real database
```

**Each layer talks only to the one below it.** Skipping a layer is what makes the swap expensive.

## The four boundary rules

**1. `apps/web` never imports a repository, Prisma, or `@lifedesk/db`.**

It calls oRPC. Enforced by ESLint `no-restricted-imports`, so a violation fails the build rather than being caught in review. This is also the actual security guarantee — see `docs/PLAN.md` §6.2.

**2. Procedures never touch a data store directly.** They call repository methods. A procedure containing a query is a procedure that has to be rewritten in Phase 2.

**3. Repositories contain no business logic.** They read and write. Validation belongs in the contract, authorization in the procedure, domain rules in `packages/core`. A repository that decides *whether* something may happen is in the wrong place.

**4. Repository interfaces stay Prisma-shaped.** This is the rule that keeps the swap honest.

```ts
// good — expressible in SQL, cheap in Postgres
findMany(userId: string, filters: TaskFilters, page: CursorPage): Promise<Page<Task>>

// never — trivial over a Map, a table scan in Postgres
findAll(userId: string): Promise<Task[]>
filter(userId: string, predicate: (t: Task) => boolean): Promise<Task[]>
```

Pass filters as **objects, not callbacks**. Paginate with **cursors, not offsets**. If a method would be easy over an in-memory Map and expensive in SQL, the interface is wrong — fix the interface, not the memory implementation.

## Every procedure filters by `userId`

Authentication is not authorization. `protectedProcedure` proves *who* is calling; it says nothing about *what they own*.

```ts
// never — an authenticated user can read anyone's task by guessing an id
const task = await repos.task.findById(input.id);

// good — ownership is part of the lookup, not a check after it
const task = await repos.task.findById(ctx.userId, input.id);
```

**The `userId` is always the first parameter of every repository method**, so an ownership-free call is impossible to write by accident. This is where real apps leak, and a type signature catches it where a code review won't.

Never accept a `userId` from procedure input. It comes from `ctx`, always.

Return **not-found, not forbidden**, when a row belongs to someone else. "Forbidden" confirms the record exists, which is itself a leak.

## Contracts

Zod schemas in `packages/contracts` are the single source of truth for entity shapes. Types are inferred from them, never declared alongside:

```ts
export const taskSchema = z.object({ /* … */ });
export type Task = z.infer<typeof taskSchema>;
```

`packages/contracts` has **zero dependencies beyond Zod** and imports nothing server-side. That's what makes it safe for a form on the client to validate with exactly the schema the server enforces.

Every procedure declares `.input()`. A procedure without input validation is not done.

## Mock data lives behind the interface, never in a component

```tsx
// never — loading, error, and empty states become fiction,
// and all of them get written for the first time on swap day
const tasks = [{ id: "1", title: "Fake task" }];
```

Mocks are seeded fixtures inside `repos/memory/`. Components use the real hooks, hit the real procedures, and render real loading and error states from day one.

Fixtures should be **realistic, not minimal**: a research project mid-flight, a week with some days full and some empty, last week's sessions so charts have something to draw. Fixtures that are too clean hide the layout problems you're building the UI to find.

## Client-side data

TanStack Query owns all server state. Do not mirror server data into `useState` or a store.

- One hook per procedure, in the feature's `hooks/` folder: `useTasks`, `useToggleTask`
- Query keys come from the oRPC helpers, never hand-written strings
- Mutations invalidate explicitly; optimistic updates on anything the user expects to feel instant (completing a task, starting the timer)

## The Phase 2 test

The measure of whether these rules were followed:

```bash
git diff --stat apps/web   # across the Phase 2 backend commits
```

Should be approximately empty. If the frontend had to change when the database arrived, a boundary leaked — and the leak was almost certainly one of the four rules above.
