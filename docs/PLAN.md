# LifeDesk — Build Plan

> **This file is the source of truth.** Decisions, design system, architecture, and progress all live here.
> If code and this document disagree, one of them is a bug — fix it in the same change.
>
> Last updated: 2026-08-31 (time blocking)

---

## Contents

1. [Context](#1-context)
2. [Locked decisions](#2-locked-decisions)
3. [Build strategy: UI first, mocked at the API boundary](#3-build-strategy-ui-first-mocked-at-the-api-boundary)
4. [UI design](#4-ui-design)
5. [Product design](#5-product-design)
6. [Architecture](#6-architecture)
7. [Data model](#7-data-model)
8. [Roadmap & progress](#8-roadmap--progress)
9. [Maintainability: `.claude/` setup](#9-maintainability-claude-setup)
10. [Verification](#10-verification)
11. [References](#11-references)
12. [Open items](#12-open-items)

---

## 1. Context

Ahmad juggles work, projects, and research in one head. The tools he's used each solve a slice: **YPT** tracks study time but doesn't plan, **StudyStream** is social focus but not a planner, **Tomito** is a lovely timer with no concept of what you're timing.

LifeDesk is the one surface where **planning and tracking are the same object** — you plan the week, click a task to start the clock, and at the end of the week the app tells you where your hours actually went versus where you said they'd go.

Built as a real multi-user product from day one (every row scoped to a user), with no social features in v1 — the app should be lived in daily by one person before anyone else sees it.

**Repo root:** `/Users/ahmad/Desktop/work/per_os` (greenfield).

---

## 2. Locked decisions

| Decision     | Choice                                              | Why                                                                       |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Hierarchy    | **Areas → Projects → Tasks** + cross-cutting tags   | Makes "where did my time go?" answerable at the level that matters        |
| Scope        | Core loop first                                     | Usable in weeks, not months                                               |
| Users        | Multi-user from day one, **no social in v1**        | Opening it up later isn't a rewrite; social doesn't block daily use       |
| Auth         | Better Auth                                         | TypeScript-native, self-hosted, first-class Prisma adapter                |
| Drag & drop  | **Not in v1**                                       | Keep it simple; `sortOrder` exists from day one so it's a UI change later |
| Mobile       | Responsive + PWA now, Expo later                    | Costs almost nothing now; native doubles UI work                          |
| UI direction | **Calm workspace**                                  | Warm paper, generous space, quiet type — for long research sessions       |
| Build order  | **UI first on mock data**, backend swapped in after | Shakes out design problems while they're cheap                            |
| Quick add    | Deliberately simple, **no NLP parsing**             | A parser wrong 15% of the time is worse than no parser                    |

---

## 3. Build strategy: UI first, mocked at the API boundary

Build a demoable, functional UI first; swap the real backend in after. The refinement that decides whether the swap is painless or miserable is **where the mock lives**.

**Don't mock in components.** Hardcoded arrays and fake `setTimeout` delays mean loading states, error states, cache invalidation, and optimistic updates are all fiction — and every one has to be written for the first time on swap day, in code you thought was finished.

**Mock behind a repository interface inside `packages/api`:**

```
apps/web  ──▶ oRPC client ──▶ real router ──▶ TaskRepo (interface)
   real         real           real Zod            │
   hooks        client        real auth mw         ├─▶ MemoryTaskRepo   ← Phase 1
                                                   └─▶ PrismaTaskRepo   ← Phase 2
```

Everything above the repository line is **real and final from day one**: real oRPC procedures, real Zod validation, real error shapes, real TanStack Query hooks with real loading, error, and empty states.

The in-memory repos hold module-level maps seeded with realistic fixtures — a research project mid-flight, a week with some days full and some empty, sessions from last week so charts have something to draw. Mutations persist for the life of the dev server, so the demo _feels_ like the product rather than a clickable mockup.

**Swap day:** write `packages/api/src/repos/prisma/*.ts` against the same interfaces, flip one factory. **Zero frontend files change.**

Two constraints that keep that promise honest:

- **Repository interfaces stay Prisma-shaped** — cursor pagination, filters as objects, no methods only an in-memory store could implement cheaply. Otherwise the interface quietly encodes assumptions Postgres can't honour.
- **Auth in Phase 1** is a dev-only session stub satisfying the same middleware contract (`ctx.userId` from a cookie). Sign-in/sign-up screens are built for real against it; Better Auth lands in Phase 2 with the database.

---

## 4. UI design

**Calm workspace.** Warm paper ground, generous whitespace, quiet typography, a single accent. It should read like a well-made notebook, not a dashboard — the app is used during long research sessions where visual noise is the enemy.

### 4.1 Principles

1. **One thing is loudest.** On Day, that's the intention line and the running timer. Everything else recedes. A screen where six things compete is a screen you avoid opening.
2. **Time is shown, never calculated.** "3h 15m planned of 6h" — never make the user add up estimates in their head. That's the app's entire job.
3. **Empty is a designed state.** Every list gets real empty copy and exactly one action. A blank Inbox should feel earned, not broken.
4. **Nothing moves that the user didn't move.** Motion only confirms causality. No decorative animation, ever.

### 4.2 Layout system

| Breakpoint            | Layout                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop** ≥1024px   | Persistent 240px left rail · content column capped at 720px · 320px right context panel for task detail (slides in, doesn't navigate away)  |
| **Tablet** 768–1023px | Rail collapses to a 64px icon strip; task detail becomes a sheet                                                                            |
| **Mobile** <768px     | Bottom tab bar (Today · Week · Inbox · Areas); rail becomes a drawer; task detail is a full-height sheet; timer bar docks above the tab bar |

Responsive is built at every step, never retrofitted.

```
DESKTOP                                    MOBILE
┌────────────┬──────────────────────┐     ┌─────────────────┐
│ ◐ LifeDesk │                      │     │ ☰   Today    ⋯  │
│            │  Thursday, 30 August │     ├─────────────────┤
│  Today     │  ────────────────    │     │ Thu 30 August   │
│  Week      │  Finish the ablations│     │ Finish the abl… │
│  Month     │  ▓▓▓▓▓▓░░░░ 3h15/6h  │     │ ▓▓▓▓▓▓░░░ 3h15  │
│  Inbox     │                      │     ├─────────────────┤
│            │  ○ Rerun ablations   │     │ ○ Rerun ablat…  │
│  AREAS     │    Research · Paper  │     │   Research  2h ▶│
│  ● Research│                 2h ▶ │     │                 │
│  ● Work    │                      │     │ ○ Read Chen et… │
│  ● Health  │  ○ Read Chen et al.  │     │   Research 45m ▶│
│            │    Research     45m ▶│     │                 │
│            │                      │     │ ✓ Standup       │
│            │  ✓ Standup      15m  │     ├─────────────────┤
├────────────┴──────────────────────┤     │▶ Rerun  00:42 ■ │
│ ▶ Rerun ablations  00:42:17    ■  │     ├─────────────────┤
└───────────────────────────────────┘     │ ◐   ▤   ⊕   ◈  │
                                          └─────────────────┘
```

### 4.3 Typography

One sans for the interface (**Geist Sans**, Inter fallback), with one deliberate exception: a serif (**Instrument Serif**) for the date header and the day's intention line. That single pairing carries the entire notebook feeling at almost no cost.

- **Scale:** 12 / 13 / 14 / 16 / 20 / 28 / 40. Body is 14.
- **Tabular numerals everywhere a number changes** — timers, durations, totals. A counting clock on proportional digits jitters every tick, and it's maddening once you notice it.
- **Timer display:** 40px, tabular, medium weight, never bold.

### 4.4 Colour

Base is shadcn `stone`. Primary is a muted clay — nods at the tomato without being a cartoon.

```css
:root {
  --background: oklch(0.99 0.004 85); /* warm paper   */
  --foreground: oklch(0.22 0.008 75);
  --muted: oklch(0.96 0.006 85);
  --border: oklch(0.92 0.006 85);
  --primary: oklch(0.55 0.13 40); /* clay         */
  --focus: oklch(0.62 0.11 155); /* session live */
}
.dark {
  --background: oklch(0.18 0.006 70);
  --foreground: oklch(0.93 0.006 85);
  --muted: oklch(0.24 0.008 70);
  --border: oklch(0.3 0.008 70);
  --primary: oklch(0.68 0.13 42);
  --focus: oklch(0.7 0.12 155);
}
```

**Two rules that keep it calm — treat these as hard constraints:**

1. **Area colour appears only as a 3px left edge or a 6px dot.** Never a filled row background. Filled backgrounds turn any list of eight items into a fruit salad.
2. **`--focus` green means exactly one thing: a session is running.** Never a success toast, never a valid input, never a completed task. That reservation is what lets peripheral vision tell you the clock is going.

**Area palette** — fixed 8 hues, so an area looks identical in every list and every chart: clay · amber · olive · teal · indigo · plum · rose · slate.

Dark mode is designed, not inverted — first-class, because evening work is most of the point.

### 4.5 Motion

- 150ms ease-out for state changes, 200ms for sheets.
- **Timer digits never animate.**
- **Completing a task:** the check draws in 200ms, then the row fades and collapses over 400ms — slow enough to see the completion happen, fast enough not to block the next one.
- Everything respects `prefers-reduced-motion`.

### 4.6 Key components

| Component       | Behaviour                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TaskRow`       | 48px tall (44px minimum tap target). Checkbox · title · area dot + project crumb · estimate chip · tracked chip when non-zero · play button revealed on hover, **always visible on touch**           |
| `TimerBar`      | Persistent, docked bottom. Collapsed: task name, elapsed, stop. Expands to today's total and a pause. Turns `--focus` green while running                                                            |
| `CapacityMeter` | Thin bar under the date. Planned estimate against daily capacity; shifts amber past 100%. Informs, never blocks                                                                                      |
| `QuickAdd`      | Single input at top of Day and Inbox. Type a title, press Enter, created in the current context. Area, estimate, and date are small optional chips beside the field. **No natural-language parsing** |
| `TaskDetail`    | Right panel on desktop, sheet on mobile. Title, notes (markdown), area/project, estimate, schedule, tags, session history                                                                            |
| `EmptyState`    | No illustration. One line of copy, one action                                                                                                                                                        |

### 4.7 Screens (Phase 1)

- **Today** — date + intention (serif), capacity meter (planned · blocked), quick add, task list beside a **day timeline** of blocked work (tabs on mobile)
- **Week** — `List | Timeline` toggle, list the default, choice remembered per viewer. Timeline is seven time-grid columns on desktop, one plus the day strip on mobile. List view: seven columns on desktop. **On mobile, a vertical agenda** with sticky day headers and a horizontal day-strip selector; seven columns on a phone is unreadable. Reschedule via date picker, not a drag
- **Inbox** — unscheduled capture, with one-tap "schedule for today"
- **Areas** → area detail → project detail
- **Sessions** — **day-scoped**: prev/next day navigation, that day's timeline of _tracked_ time, day total and per-area breakdown, the day's session list. The runaway-review banner is global, not per-day — a forgotten timer must be visible from whatever day you're on
- **Settings** — timezone, week start, daily capacity, theme
- **Sign in / sign up** — built for real against the auth stub

---

## 5. Product design

### 5.1 The core loop

> **Month sets outcomes → Week commits → Day executes → Timer records → Review closes.**

Every feature either serves that loop or gets cut.

Most planners fail because they're an infinite list with dates attached. LifeDesk's answer is a **deliberate pull**: tasks live in the backlog, and you pull a small, capacity-aware set into today.

### 5.2 Features

Additions beyond the original ask are marked **[+]**, with reasoning.

**Planning**

- Areas → Projects → Tasks, plus cross-cutting tags
- Day, Week, Inbox
- **Month = outcomes and milestones, not a task grid [+]** — a month grid of tasks is unreadable and nobody uses it. What a month is good for is "ship the draft, finish two chapters, run the ablations"
- **Estimates compared against tracked time [+]** — the highest-value addition. After three weeks it tells you you're 2.4× optimistic on research and roughly right on work, and planning stops being fiction
- **Daily capacity warning [+]** — a soft cap, so you notice you've planned nine hours before the day rather than after it

**Time tracking**

- One click from a task to start; stop when done
- Manual entry and session editing — **you will forget to stop the timer**, so this is not optional polish
- **Runaway guard [+]** — a session past a threshold is flagged for review rather than silently logging 14 hours
- **Server-authoritative timer [+]** — elapsed derives from a `startedAt` timestamp held server-side, not a client interval. Survives refresh, tab close, laptop sleep, second device. This is the difference between a timer you trust and one you don't
- One running session per user, enforced at the data layer

**Pomodoro** (borrowed from Tomito)

- Configurable work / short break / long break and long-break interval
- Desktop notifications, alert sound, optional ticking
- Daily and weekly session stats
- **Floating always-on-top timer via the Document Picture-in-Picture API [+]** — the web's answer to Tomito's menu bar. A small window with task name and countdown floating over your editor. Browser-native, no Electron

**Notes** — markdown on any task and project, plus a **daily note [+]** reachable from Day.

**Recurring tasks** — daily / weekdays / weekly-on / monthly-on / every-N. Occurrences generated lazily, so completing one doesn't touch the others. Skip an occurrence, or end the series.

**Review** — **weekly review page [+]**: what shipped, hours by area, what rolls forward. This is the glue between month, week, and day; without it the app is a to-do list with a stopwatch. Plus analytics: time by area/project/tag, day-of-week heatmap, estimate accuracy, focus streaks.

**Interaction** — command palette (⌘K), keyboard shortcuts throughout. Drag-and-drop is **deferred, not designed out**: every orderable table carries an explicit `sortOrder` from day one.

### 5.3 Deliberately out of scope

- **Kanban board** — a third view of tasks that Day and Week already cover
- **Deep sub-task nesting** — one level of checklist items only; deep trees are where personal planners go to die
- **Two-way calendar sync** — genuinely hard (conflicts, recurring-event edge cases, token refresh). The useful 20% is a read-only Google Calendar overlay on Day. Phase 4
- **Teams, sharing, comments**

---

## 6. Architecture

### 6.1 Stack

Versions verified against npm on 2026-08-30. **Pin these exactly.**

| Concern          | Choice                                  | Version                                        |
| ---------------- | --------------------------------------- | ---------------------------------------------- |
| Monorepo         | pnpm workspaces + Turborepo             | turbo 2.10.12                                  |
| App              | Next.js App Router                      | 16.3.3 (React 19.2.8)                          |
| UI               | shadcn/ui + Tailwind                    | CLI 4.19.0 · Tailwind 4.3.3                    |
| RPC              | oRPC                                    | **1.15.0** — stable v1; v2 is beta, do not use |
| Data             | TanStack Query + `@orpc/tanstack-query` | 5.102.8 / 1.15.0                               |
| ORM _(Phase 2)_  | Prisma                                  | **7.10.0**                                     |
| DB _(Phase 2)_   | Neon + `@prisma/adapter-neon`           | 7.10.0                                         |
| Auth _(Phase 2)_ | Better Auth                             | 1.7.2                                          |
| Validation       | Zod                                     | 4.5.4                                          |
| Dates            | date-fns + date-fns-tz                  | 4.4.0                                          |

**Why Prisma 7.10.0 and not 8.** npm's `latest` tag currently points at `prisma@8.0.0-rc.12` — a release candidate — and `@prisma/adapter-neon` has no 8.x stable at all. Pin 7.10.0 across `prisma`, `@prisma/client`, and the adapter.

Prisma 7 has real breaking changes we design around: the `prisma-client` generator with a mandatory `output` path, mandatory driver adapters, `prisma.config.ts`, ESM-first output, `$use()` middleware removed. There is a [known open issue](https://github.com/prisma/prisma/issues/28627) where the generated client's ESM `.js` specifiers break bundlers. **Our layout avoids it**: the generated client lives inside `packages/db`, a Node-only workspace package listed in Next's `serverExternalPackages`, so Turbopack never tries to bundle it. Escape hatch if it still bites: `moduleFormat = "cjs"`.

### 6.2 Security model

> **The premise "oRPC stops people interacting with it from the frontend" is not quite right, and the distinction matters.**

oRPC does not make endpoints unreachable. **Anything your browser can call, a person with devtools can call** — equally true of tRPC, REST, GraphQL, and Server Actions. oRPC's real jobs are end-to-end type safety, validation at the boundary, and composable middleware.

What actually provides the guarantee:

1. **The frontend physically cannot reach the database.** `@lifedesk/db` is never a dependency of `apps/web`, and an ESLint boundary rule fails the build if anyone adds it. Prisma is importable only inside `packages/api/src/repos/prisma`.
2. **Every procedure descends from `protectedProcedure`**, which resolves the session in middleware and injects `ctx.userId`. There is no base procedure handing out a data client without a user attached.
3. **Every query filters by `userId`** — authorization, not just authentication. This is where real apps leak: an authenticated user requesting _someone else's_ task id.
4. **Zod validates every input** before a handler runs.
5. **Rate limiting** on the RPC route handler.
6. **Genuinely server-only procedures** (maintenance, cron, admin) live in a separate router never mounted on the HTTP handler — reachable only via the server-side client from RSC. That's the one tier a browser truly cannot touch.

Also: during server rendering, oRPC calls the router **in-process with no HTTP round trip**, so page loads don't hit a public endpoint at all.

### 6.3 Repository layout

```
per_os/
├── docs/
│   └── PLAN.md                   ← this file, the source of truth
├── apps/
│   └── web/                      Next.js — UI only, never touches Prisma
│       └── src/
│           ├── app/              routes; app/rpc/[[...rest]]/route.ts
│           ├── features/         vertical slices
│           │   └── <feature>/
│           │       ├── components/   one component per file
│           │       ├── hooks/
│           │       ├── lib/
│           │       ├── constants.ts
│           │       └── types.ts
│           └── lib/              orpc client, query client, providers
├── packages/
│   ├── ui/                       shadcn components, tokens, Tailwind preset
│   ├── contracts/                Zod schemas + inferred types (zero deps)
│   ├── api/                      oRPC routers, auth middleware, repositories
│   │   └── src/repos/
│   │       ├── types.ts          the interfaces
│   │       ├── memory/           Phase 1
│   │       └── prisma/           Phase 2
│   ├── db/                       Prisma schema + generated client (Phase 2)
│   └── core/                     pure domain logic: time, recurrence, capacity
└── tooling/
    ├── eslint-config/
    ├── typescript-config/
    └── tailwind-config/
```

**Why `packages/contracts` is separate:** forms validate with the same schema the server enforces, with no risk of a barrel import dragging server code into the client bundle.

**Why `packages/core` is separate:** pure functions with no I/O. The recurrence engine and all timezone math live there, which makes the trickiest logic in the app trivially unit-testable.

### 6.4 Code conventions

Enforced by machine wherever possible — rules a human has to remember are rules that decay.

- **One component per file**, filename matches the export (`TaskRow.tsx` exports `TaskRow`)
- **`constants.ts`, `types.ts`, `utils.ts` as separate colocated files** per feature
- **Named exports only**, except where Next.js requires a default (`page.tsx`, `layout.tsx`, route handlers)
- **Feature-folder structure** — vertical slices, not `components/` / `hooks/` megafolders
- **No `any`.** Strict TypeScript with `noUncheckedIndexedAccess`
- **`"use client"` at the leaf-most component that needs it**, never at a page or layout by default
- **All dates UTC in storage; every conversion through `packages/core/time`.** Never `new Date()` inside a component
- **Handlers talk to repositories, never to Prisma directly**
- ESLint `no-restricted-imports` boundary rules · Prettier · Turborepo pipelines

---

## 7. Data model

Phase 1 expresses this as Zod contracts and repository interfaces; Phase 2 turns it into a Prisma schema.

```
UserSettings   userId, timezone, weekStartsOn, dailyCapacityMin,
               pomodoroWorkMin, shortBreakMin, longBreakMin, longBreakEvery,
               soundEnabled, tickingEnabled, theme

Area           userId, name, color, icon, sortOrder, archivedAt
Project        userId, areaId?, name, description, status,
               startDate?, dueDate?, color?, sortOrder, archivedAt
Task           userId, projectId?, areaId?, parentTaskId?,      ← one level only
               title, notes(md), status, priority,
               estimateMin?, dueDate?, scheduledFor?, completedAt?, sortOrder,
               plannedStartMin?, plannedEndMin?                  ← time block
Tag            userId, name, color
TaskTag        taskId, tagId
TimeSession    userId, taskId?, projectId?, areaId?,
               startedAt, endedAt?, durationSec?, source, note?
```

**Design points that matter:**

- **Planned time is minutes from local midnight, not a timestamp.** A block means "09:00 wherever you are"; a UTC instant would drift when you travel or when the clocks change — the exact bug `CalendarDay` exists to prevent. Deliberately separate from `estimateMin`: an estimate is how long you think it takes, a block is when you set the time aside. Both null or both set; clearing the day clears the block; blocks never cross midnight.
- **`areaId`/`projectId` denormalized onto `TimeSession`**, captured at session start. Move a task to another project later and last month's report doesn't silently rewrite itself.
- **One running session per user** — Phase 2 enforces it with a partial unique index on `TimeSession(userId) WHERE endedAt IS NULL`, so the database guarantees it rather than the application hoping.
- **All timestamps UTC** (`timestamptz`); date-only fields (`scheduledFor`, `dueDate`, `startDate`) stored as **`VarChar(10)` holding `YYYY-MM-DD`**, not Postgres `date`. Prisma surfaces a `date` column as a JS `Date` at UTC midnight — precisely the "Thursday renders as Wednesday evening" bug this rule exists to prevent. ISO strings sort lexicographically == chronologically, so ordering and range queries are unaffected, and every day calculation already lives in `packages/core/time` rather than in SQL. The conversion is removed rather than done carefully. Every timezone conversion goes through `packages/core/time` using the user's stored timezone. A planner that gets this wrong shows tasks on the wrong day after a flight, and it is miserable to retrofit.
- **Composite indexes on `(userId, scheduledFor)` and `(userId, startedAt)`** — the two queries every screen makes.
- **Soft delete via `archivedAt`** on Area and Project; a stray click shouldn't orphan three months of tracked time.

Phase 3 adds `RecurringTask`, `Note` (daily), `Goal` (month outcomes), `WeekReview`.

---

## 8. Roadmap & progress

### Phase 1 — functional UI on mock data _(demoable)_

- [x] 1. **Scaffold** — pnpm workspace, Turborepo, `tooling/*`, pinned versions
- [x] 1.5. **`.claude/` pass A** — root `CLAUDE.md`, `settings.json`, and the prescriptive rules (see §9). Written _before_ the code so they steer it
- [x] 2. **`packages/ui`** — shadcn init `--monorepo`, Tailwind v4, tokens, fonts, dark mode, base components. `components.json` in both `apps/web` and `packages/ui` with matching `style` / `iconLibrary` / `baseColor`
- [x] 3. **`packages/contracts`** — Zod schemas for every Phase 1 entity
- [x] 4. **`packages/core`** — time and capacity math, with unit tests
- [x] 5. **`packages/api`** — repository interfaces, memory implementations, realistic fixtures, oRPC base router, `protectedProcedure` + dev session stub, routers for area / project / task / tag / session
- [x] 6. **`apps/web` wiring** — `app/rpc/[[...rest]]/route.ts`, browser client, server-side client for RSC, TanStack Query with hydration
- [x] 6.5. **`.claude/` pass B** — descriptive rules and skills, written against the first real vertical slice (see §9)
- [x] 7. **App shell** — rail, mobile tab bar, drawer, responsive breakpoints, theme toggle
- [x] 8. **Auth screens** against the stub
- [x] 9. **Areas & Projects** — list, detail, create/edit, archive
- [x] 10. **Tasks** — Inbox, task list, TaskDetail panel/sheet, notes, tags, complete
- [x] 11. **Today** — intention, capacity meter, quick add, session history
- [x] 12. **Week** — desktop columns, mobile agenda, reschedule via date picker
- [x] 13. **Timer** — start/stop anywhere, persistent TimerBar, session list, manual entry, runaway guard
- [x] 14. **Settings** · PWA manifest, icons, install
- [ ] 15. **Demo pass** — live in it on fixtures, fix what annoys. Ongoing; findings land in Phase 2.5

**Known gaps, deliberately carried past the backend swap** → Phase 2.5. In every case the API is finished and only the UI is missing, so nothing here blocks Phase 2.

### Phase 2 — real backend _(no frontend changes)_

- [ ] 16. `packages/db` — Prisma 7 schema, `prisma.config.ts`, Neon adapter, generator output inside the package, initial migration, seed
- [ ] 17. `packages/api/src/repos/prisma/*` against the same interfaces; flip the factory
- [ ] 18. Better Auth replacing the stub — email+password, Google, onboarding that seeds default areas and settings
- [ ] 19. Rate limiting, error monitoring, deploy

### Phase 2.5 — Phase 1 loose ends _(after the swap)_

Deferred until the real backend is in. Two reasons, and they are the point rather than an excuse:

1. **It protects the Phase 2 test.** The measure of a clean swap is `git diff --stat apps/web` being ~empty across the backend commits. Building new screens *during* the swap would make that number meaningless. Swap first, verify the diff, then build.
2. **One of them needs a schema change anyway.** The intention line has no field in `packages/contracts`, so doing it after Prisma means adding a column once rather than adding it to the memory repos and migrating it a week later.

The rest are pure UI against procedures that already exist, so they get built once, directly against the real database.

- [ ] **Manual session entry and editing** — `session.create` and `session.update` exist with **0 web call sites**; only `RunawayBanner` calls `update`. A forgotten timer can be corrected, but a session you never started cannot be added. Highest value of the five: the plan calls this "not optional polish — you will forget to stop the timer"
- [ ] **Project detail** — no `/projects/[id]`; `project.get` exists, **0 call sites**. Projects are created and listed from the area page but cannot be opened, which is a dead end you hit constantly
- [ ] **Tags UI** — `tag.list`, `tag.create` and `task.addTag` are complete end-to-end and called from nowhere
- [ ] **PWA raster icons** — 192/512 PNG; only `icon.svg` ships
- [ ] **Day intention line** — designed in §4.7. Needs a `DayPlan`/intention field first, so it is the largest of the five, not the smallest

### Phase 1.5 — time blocking and timelines _(shipped)_

- [x] `plannedStartMin` / `plannedEndMin` on Task, `task.setPlannedTime`
- [x] `packages/core/schedule` — lane packing for overlaps, visible-hour window
- [x] Shared `DayGrid` — one column for Today, seven for Week, built to take a
      second "actual" layer later
- [x] Today: list + timeline, capacity shows blocked vs planned
- [x] Week: List/Timeline toggle, persisted
- [x] Sessions: day-scoped with a timeline of tracked time; runaway banner global
- [x] Design rule amended — area colour may fill a **grid block** (never a list row)

Deferred from this pass: sessions overlaid on the planned grid, recurring
routine blocks, drag-and-drop, blocks crossing midnight.

### Phase 3 — the thing that teaches you

- [ ] Recurring tasks
- [ ] Pomodoro + PiP floating timer
- [ ] Estimates vs actual
- [ ] Month / outcomes view
- [ ] Weekly review
- [ ] Analytics dashboard
- [ ] Command palette (⌘K)

### Phase 4 — polish and reach

- [ ] Habits & streaks
- [ ] Project templates
- [ ] Google Calendar read-only overlay
- [ ] Offline support
- [ ] Data export
- [ ] `apps/mobile` (Expo), if still wanted

---

## 9. Maintainability: `.claude/` setup

Guidance followed: **layer, don't centralize**, with **progressive disclosure** — a lean root file that always loads, detailed rules in separate files referenced by path so they load only when relevant.

### When each piece gets written

Two passes, because the rules split into two kinds:

- **Pass A — prescriptive rules, written _before_ any code (step 1.5).** These are decisions already made in this document — file organization, design tokens, timezone handling, the data-access boundary. Writing them first is the point: they steer the build instead of being retrofitted onto it.
- **Pass B — descriptive rules, written after the first vertical slice (after step 6).** These describe patterns that must exist before they can be documented honestly — the exact shape of an oRPC procedure, the `add-feature` walkthrough, the review checklist. Written against real files, with real paths.

| Artifact                                              | Pass    |
| ----------------------------------------------------- | ------- |
| Artifact                                              | Pass    | Status                                                                   |
| ---                                                   | ---     | ---                                                                      |
| Root `CLAUDE.md`                                      | A       | ✅                                                                       |
| `.claude/settings.json` — permissions                 | A       | ✅                                                                       |
| `.claude/settings.json` — hooks                       | A       | ⏳ after step 1 (a Stop hook running `typecheck` fails on an empty repo) |
| `rules/file-organization.md`                          | A       | ✅                                                                       |
| `rules/design-tokens.md`                              | A       | ✅                                                                       |
| `rules/dates-and-timezones.md`                        | A       | ✅                                                                       |
| `rules/data-access.md`                                | A       | ✅                                                                       |
| `rules/ui-components.md`                              | A       | ✅                                                                       |
| `skills/add-feature`                                  | A       | ✅                                                                       |
| `skills/review-checklist`                             | A       | ✅                                                                       |
| `apps/web/CLAUDE.md`, `packages/api/CLAUDE.md`        | B       | —                                                                        |
| `rules/orpc-procedures.md`                            | B       | —                                                                        |
| `skills/add-procedure`, `skills/add-shadcn-component` | B       | —                                                                        |
| `packages/db/CLAUDE.md`, `skills/db-migrate`          | Phase 2 | —                                                                        |

### `CLAUDE.md` files (root under ~100 lines)

- **Root** — stack with pinned versions, exact commands, layout, the handful of hard rules, an Always / Ask First / Never boundary list, and a pointer to this file
- **`apps/web/`** — component and hook conventions, server/client boundary, responsive rules
- **`packages/api/`** — procedure conventions, the auth rules in §6.2, repository pattern
- **`packages/db/`** — schema and migration rules _(Phase 2)_

### `.claude/rules/` (loaded on reference)

| File                     | Covers                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `file-organization.md`   | One component per file, colocated `constants`/`types`/`utils`, feature folders, named exports  |
| `orpc-procedures.md`     | How to add a procedure; `protectedProcedure` always; every query filtered by `userId`          |
| `data-access.md`         | Handlers talk to repositories, never Prisma directly; Prisma confined to `repos/prisma`        |
| `ui-components.md`       | shadcn usage, `packages/ui` vs app-local, `"use client"` at the leaf, mobile-first breakpoints |
| `design-tokens.md`       | The palette and type scale in §4, and the two hard colour rules                                |
| `dates-and-timezones.md` | UTC storage, conversion only through `packages/core/time`, never `new Date()` in a component   |

### `.claude/skills/`

- **`add-feature`** — the vertical slice in order: contract → repo interface → memory repo → procedure → hook → component → test
- **`add-procedure`**, **`add-shadcn-component`**, **`db-migrate`** _(Phase 2)_
- **`review-checklist`** — ownership filters present, Zod on every input, no Prisma outside the repo layer, no `any`, mobile layout checked

### `.claude/settings.json`

Permission allowlist for routine dev commands, plus a Stop hook running `pnpm lint` and `pnpm typecheck` so drift is caught immediately.

---

## 10. Verification

### Phase 1

```bash
pnpm install && pnpm dev
```

Walkthrough — driven in a browser at desktop width **and at 390px**:

1. Sign in via the stub → shell renders, rail on desktop, tab bar on mobile
2. Create area _Research_ → project _Paper_ → task _Rerun ablations_, 2h, today
3. Day view shows it; capacity meter reflects 2h against the cap
4. Start the timer → TimerBar turns `--focus` green, counts with tabular digits, no jitter
5. **Navigate to Week and back** → still running, elapsed correct
6. Stop → session appears in history with a sensible duration
7. Add a markdown note; complete the task; watch the row check, fade, and collapse
8. Week: desktop shows seven columns, **mobile shows the agenda with the day strip**
9. Empty every list in turn; confirm each empty state reads deliberately
10. Toggle dark mode on every screen; run through with `prefers-reduced-motion` on

### Phase 2 — the checks that actually matter

- Sign in as user A, capture a task id. As user B, call `task.get` with A's id from devtools → **must** return not-found, not the task
- Any procedure signed out → unauthorized
- `@lifedesk/db` absent from `apps/web/package.json`; adding an import of it fails lint
- No Prisma code in the client bundle
- **The swap itself:** `git diff --stat apps/web` across the Phase 2 backend commits should be ~empty. If the frontend had to change, the repository interface was leaking

### Automated

```bash
pnpm typecheck && pnpm lint && pnpm test
```

- Unit tests on `packages/core` — timezone conversion across DST, capacity math, duration rounding
- **Contract tests on `packages/api` run against both repository implementations**, so the memory and Prisma repos are provably interchangeable
- One ownership test per router asserting cross-user access fails

---

## 11. References

- [shadcn/ui monorepo guide](https://ui.shadcn.com/docs/monorepo)
- [oRPC docs](https://orpc.dev/docs/getting-started) · [oRPC + TanStack Query](https://orpc.dev/docs/integrations/tanstack-query) · [oRPC Next adapter](https://orpc.dev/docs/adapters/next)
- [Prisma v7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) · [Prisma + Neon](https://www.prisma.io/docs/orm/v6/overview/databases/neon)
- [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma)
- CLAUDE.md structure: [best-practices guide](https://dev.to/nishilbhave/claudemd-best-practices-the-complete-2026-guide-435j) · [structuring CLAUDE.md, skills and agents](https://dev.to/hash01/how-to-structure-claudemd-skills-and-agents-2p7a)

---

## 12. Open items

Not blocking Phase 1.

- [ ] Neon connection strings (pooled + direct) — needed at step 16
- [ ] Google OAuth client id + secret — needed at step 18; email+password works without it
- [ ] Deployment target — assumed Vercel unless told otherwise
