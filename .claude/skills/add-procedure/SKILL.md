---
name: add-procedure
description: Add a single oRPC procedure to an existing LifeDesk router and wire a client hook for it. Use when the entity, contract, and repository already exist and only a new endpoint is needed — for a whole new entity use add-feature instead.
---

# Adding a procedure

For when the entity already exists and you just need another endpoint. If you're adding a new entity, use `add-feature` — it covers the layers below this one.

Read `.claude/rules/orpc-procedures.md` first.

## 1. Input schema — `packages/contracts/src/<entity>.ts`

Reuse an existing schema if one fits. Otherwise add one there, not inline — the client's form needs it too.

Inline `z.object({ id: idSchema })` is fine for a trivial identifier argument, and only that.

## 2. Repository method — only if the data isn't reachable yet

Add it to the interface in `packages/api/src/repos/types.ts`, then implement in `repos/memory/<entity>.ts`.

- `userId` is the **first parameter**.
- Filter by it inside the method, mirroring the real `WHERE` clause.
- Keep it Prisma-shaped: object filters, cursor pagination, no callbacks. If it's trivial over a `Map` but a table scan in SQL, the signature is wrong.
- Return `null` for a missing or foreign row. Never throw.

## 3. Procedure — `packages/api/src/routers/<entity>.ts`

```ts
myThing: protectedProcedure
  .input(mySchema)
  .handler(async ({ input, context }) => {
    const row = await context.repos.thing.find(context.userId, input.id);
    return row ?? notFound("Thing");
  }),
```

Check the list before moving on:

- [ ] `protectedProcedure`, not `publicProcedure`
- [ ] `.input()` present
- [ ] `context.userId` passed first; no `userId` from input
- [ ] Any referenced entity checked for ownership before use
- [ ] `notFound()` rather than a forbidden error
- [ ] Time converted here via `context.now()` and the user's timezone, not in the repository
- [ ] No business logic — that belongs in `@lifedesk/core`

New router? Add it to `appRouter` in `routers/index.ts`.

## 4. Ownership test — `packages/api/src/routers/ownership.test.ts`

Not optional. One case proving user B cannot reach user A's row:

```ts
await expectNotFound(call(appRouter.thing.myThing, { id }, { context: ctx(USER_B) }));
```

## 5. Client hook — `apps/web/src/features/<feature>/hooks/`

```ts
export function useMyThing(input: MyInput) {
  return useQuery(orpc.thing.myThing.queryOptions({ input }));
}
```

Mutations invalidate by key, never by string:

```ts
onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.thing.key() }),
onError: (error) => toast.error(error.message),
```

Add an optimistic update if the user should feel it instantly — `useSetTaskComplete` is the pattern.

## 6. Prefetch, if a page needs it on first paint

In the page's server component, with **input identical to the hook's** — a mismatch silently misses the cache and refetches:

```ts
await queryClient.prefetchQuery(orpc.thing.myThing.queryOptions({ input }));
```

## 7. Verify

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Then confirm the wire format and the auth gate:

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -H "Cookie: lifedesk_dev_session=00000000-0000-4000-8000-000000000001" \
  -d '{"json":{}}' http://localhost:3000/rpc/thing/myThing

# Without the cookie this must return UNAUTHORIZED, not data.
```
