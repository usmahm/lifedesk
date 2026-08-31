# File organization

How code is laid out in this repo. Applies everywhere unless a package's own `CLAUDE.md` overrides it.

## Feature folders, not type folders

`apps/web/src` is organized in **vertical slices**. A feature owns its components, hooks, and helpers. There is no top-level `components/` or `hooks/` megafolder — those turn into dumping grounds where nothing can be deleted because nobody knows what still uses it.

```
apps/web/src/features/tasks/
├── components/
│   ├── TaskRow.tsx
│   ├── TaskList.tsx
│   ├── TaskDetail.tsx
│   └── TaskEmptyState.tsx
├── hooks/
│   ├── useTasks.ts
│   └── useToggleTask.ts
├── lib/
│   └── group-tasks-by-day.ts
├── constants.ts
├── types.ts
└── index.ts          ← the feature's public surface
```

**Cross-feature imports go through `index.ts`.** Reaching into `features/tasks/components/TaskRow` from another feature is a smell: either it belongs in `packages/ui`, or the two features should be one.

Genuinely app-wide things (the shell, providers, the oRPC client) live in `apps/web/src/lib` and `apps/web/src/components/layout`, not in a feature.

## One component per file

The filename matches the export exactly.

```
TaskRow.tsx        → export function TaskRow()
CapacityMeter.tsx  → export function CapacityMeter()
```

A small component used only by its neighbour still gets its own file. "It's only 12 lines" is how a 400-line file starts.

The one exception: a component's own tightly-bound sub-parts (a `TaskRow.Skeleton`) may live in the same file if they are exported as properties of the parent and used nowhere else.

## Separate files for constants, types, and utils

Never inline these at the top of a component file.

| File | Holds |
|---|---|
| `constants.ts` | Magic values, option lists, config. `SCREAMING_SNAKE_CASE`. |
| `types.ts` | Local types and interfaces. Shared entity types come from `@lifedesk/contracts` — don't redeclare them. |
| `utils.ts` or `lib/*.ts` | Pure helpers. One concern per file once `utils.ts` passes ~100 lines. |

Pure logic that isn't React-specific and might be needed on the server belongs in **`packages/core`**, not in a feature's `lib/`. If you'd want to unit-test it without a DOM, it goes in `core`.

## Exports

**Named exports only.** The exception is where Next.js requires a default: `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `middleware.ts`.

No barrel file re-exporting an entire folder (`export * from './components'`). Barrels defeat tree-shaking and create import cycles. A feature's `index.ts` lists its public exports explicitly:

```ts
export { TaskList } from "./components/TaskList";
export { TaskDetail } from "./components/TaskDetail";
export { useTasks } from "./hooks/useTasks";
```

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component file | `PascalCase.tsx` | `TaskRow.tsx` |
| Hook file | `camelCase.ts`, `use` prefix | `useTasks.ts` |
| Everything else | `kebab-case.ts` | `group-tasks-by-day.ts` |
| Type / interface | `PascalCase`, no `I` prefix | `TaskFilters` |
| Boolean | `is` / `has` / `should` prefix | `isRunning`, `hasEstimate` |
| Event handler prop | `on` + event | `onComplete` |
| Handler implementation | `handle` + event | `handleComplete` |

## Imports

Ordered, with a blank line between groups:

1. React and Next
2. External packages
3. Workspace packages (`@lifedesk/*`)
4. Feature-relative (`@/features/...`, `@/lib/...`)
5. Relative (`./`, `../`)
6. Types (`import type`) — always use `import type` for type-only imports

Use `@/` for anything outside the current folder. Relative imports only for immediate siblings.

## Server and client components

Default to a **server component**. Add `"use client"` only to the leaf-most component that actually needs interactivity, state, or an effect.

Marking a `page.tsx` or `layout.tsx` as a client component drags the entire subtree into the bundle. If a page needs one interactive widget, that widget is the client component — not the page.

## File length

No hard limit, but a component past ~150 lines is usually doing two jobs. Split by responsibility, not by line count — three arbitrary fragments are worse than one coherent file.
