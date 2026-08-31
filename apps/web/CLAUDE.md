@AGENTS.md

# apps/web

The UI. It calls oRPC and knows nothing about storage.

Read `.claude/rules/ui-components.md` and `.claude/rules/design-tokens.md` before building a screen.

## Structure

```
src/app/(app)/*      authed routes — wrapped in AppShell, redirect to /sign-in
src/app/(auth)/*     sign-in, sign-up
src/app/rpc/…        the oRPC route handler — the only public API surface
src/components/      app-wide only: layout shell, ErrorState
src/features/<x>/    vertical slices: components/ hooks/ lib/ constants.ts types.ts
src/lib/             orpc clients, query client, auth session, clock
```

## Server / client split

Pages are **server components** that prefetch, then hand a dehydrated cache to a client view:

```tsx
const queryClient = makeQueryClient();
const orpc = serverOrpc();
await queryClient.prefetchQuery(orpc.task.list.queryOptions({ input }));
return <HydrationBoundary state={dehydrate(queryClient)}><TodayView /></HydrationBoundary>;
```

The prefetch input must match the client hook's input **exactly**, or the cache misses and the page refetches everything. `src/app/(app)/today/page.tsx` is the reference.

`serverClient()` calls the router in-process — no HTTP, so a page load never hits the public endpoint.

`"use client"` goes on the leaf-most component that needs it. The `*View` components are the usual boundary.

## Data

- One hook per procedure in `features/<x>/hooks/`. Query keys come from `orpc.*.key()`, never strings.
- TanStack Query owns server state. Never mirror it into `useState`.
- Optimistic updates on anything that should feel instant — see `useSetTaskComplete`.

## React 19 rules are enforced as errors

`eslint-plugin-react-hooks` v7 runs the compiler rules. Two patterns you cannot use:

- **`setState` inside an effect body.** Re-seed state with a `key` on a child instead (`TaskDetailSheet`), use an uncontrolled input with `defaultValue` (`SettingsView` capacity), or subscribe with `useSyncExternalStore` (`useRunningSession`, `useIsHydrated`).
- **Reading a ref during render.** Refs belong in effects and event handlers.

These flagged real problems every time they fired here. Fix the design; don't disable the rule.

## Dates

`new Date()` and `Date.now()` are lint errors everywhere except `src/lib/clock.ts`. Import from `@lifedesk/core/time`.

"Today" comes from `useToday()` — the server resolves it in the user's stored timezone, which is not the browser's.

## Boundaries

- Never import `@lifedesk/db`, `@prisma/*`, a repository, or a date library directly — lint will fail the build
- Mobile layout ships in the same change as desktop
- All four list states (loading skeleton, error + retry, empty, loaded) ship together
