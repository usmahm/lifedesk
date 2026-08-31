---
name: review-checklist
description: Review LifeDesk changes against the project's boundary, security, design, and convention rules before calling work done. Use after finishing a feature or before handing a change over.
---

# Review checklist

Work through this before calling a change done. Anything unchecked is either fixed or explicitly called out to the user — silently shipping a known gap is not an option.

## Security and boundaries

- [ ] **Every repository call passes `ctx.userId` first.** No `findById(id)` without an owner — this is the exact shape of a real data leak.
- [ ] **`userId` never comes from procedure input.** Always from `ctx`.
- [ ] **Another user's row returns not-found, not forbidden.** "Forbidden" confirms the record exists.
- [ ] **Every procedure has `.input()`** with a Zod schema.
- [ ] **`apps/web` imports no repository, no Prisma, no `@lifedesk/db`.** Lint should catch this; confirm it actually ran.
- [ ] **No business logic in a repository** — it reads and writes, nothing else.
- [ ] **Repository methods stay Prisma-shaped** — object filters, cursor pagination, nothing that's cheap over a `Map` and a table scan in SQL.

## Types and conventions

- [ ] No `any`. No unexplained `@ts-expect-error`.
- [ ] Entity types inferred from Zod schemas, not hand-declared alongside them.
- [ ] One component per file, filename matching the export.
- [ ] `constants.ts` / `types.ts` / `utils.ts` are separate files, not inlined at the top of a component.
- [ ] Named exports, except where Next.js requires a default.
- [ ] No barrel re-exporting a whole folder; the feature's `index.ts` lists exports explicitly.
- [ ] Cross-feature imports go through `index.ts`, not into another feature's internals.

## Dates and time

- [ ] No `new Date()` in a component.
- [ ] Calendar days (`scheduledFor`, `dueDate`) are `YYYY-MM-DD`, not timestamps at midnight.
- [ ] "Today" and week boundaries computed in the **user's** timezone, not the server's or the browser's.
- [ ] Running elapsed time derived from `startedAt`, never accumulated in an interval.
- [ ] Durations stored as integer seconds; formatting only at the render edge.
- [ ] Anything new in `packages/core/time` has a unit test, including a DST case if it touches day boundaries.

## UI

- [ ] **All four list states exist**: loading skeleton matching the real layout, error with retry, empty with one action, loaded.
- [ ] Empty copy is specific and calm — not "No items found".
- [ ] **Mobile layout shipped in this change**, not deferred. Checked at 390px, 768px, 1440px.
- [ ] Both themes checked on every screen touched.
- [ ] Nothing revealed on hover is unreachable on touch.
- [ ] Tap targets ≥44px.
- [ ] `"use client"` on the leaf-most component that needs it — not on a page or layout.

## Design tokens

- [ ] **Area colour only as a 6px dot or 3px left edge** — never a filled background.
- [ ] **`--focus` green used only for a running session** — not success, not valid, not completed.
- [ ] `tabular-nums` on every number that changes or sits in a column.
- [ ] Semantic tokens (`bg-background`, `text-muted-foreground`) — no raw palette classes like `bg-stone-100`.
- [ ] Instrument Serif used only for the date header and intention line.
- [ ] Animations respect `prefers-reduced-motion`; timer digits don't animate.

## Accessibility

- [ ] Keyboard reachable, with a visible focus ring.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Colour is never the only signal — the running state carries an icon or label too.
- [ ] Radix/shadcn primitives used rather than a hand-rolled dialog, popover, or menu.

## Scope

- [ ] Nothing added from `docs/PLAN.md` §5.3 (out of scope).
- [ ] No drag-and-drop — deferred deliberately in Phase 1.
- [ ] No Prisma, database, or Better Auth before Phase 2.
- [ ] No new dependency or version bump without asking.
- [ ] `docs/PLAN.md` updated if a decision changed, and its roadmap checkboxes reflect what actually shipped.

## Final

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Report honestly. If a test fails, say so with the output. If something was skipped, say which and why.
