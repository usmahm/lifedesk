# UI components

Building components, using shadcn, and getting responsive right. Visual tokens are in `.claude/rules/design-tokens.md`; this file is about structure.

## Where a component goes

| It is…                                                                       | Put it in                                     |
| ---------------------------------------------------------------------------- | --------------------------------------------- |
| A generic primitive with no LifeDesk knowledge (Button, Sheet, Popover)      | `packages/ui`                                 |
| Used by two or more features, still domain-aware (`AreaDot`, `DurationChip`) | `packages/ui/src/components/domain/`          |
| Used by exactly one feature                                                  | `apps/web/src/features/<feature>/components/` |
| App shell — rail, tab bar, timer bar                                         | `apps/web/src/components/layout/`             |

**Start it in the feature.** Promote to `packages/ui` on the _second_ real use, not in anticipation of one. A shared component with one caller is a guess, and it usually guesses wrong about the API.

## shadcn

Add components from the app directory so the CLI resolves workspace paths correctly:

```bash
cd apps/web && pnpm dlx shadcn@latest add <component>
```

Base primitives land in `packages/ui`; blocks and forms land in the app. Both `components.json` files must keep matching `style`, `iconLibrary`, and `baseColor` — mismatched values produce components that quietly don't match.

**Edit generated components freely.** shadcn is source you own, not a dependency. But make edits in `packages/ui` so every caller gets them, and don't fork a primitive into a feature folder to change one class — extend it with a variant.

Add variants with `cva` rather than piling conditional classes at call sites:

```tsx
const taskRowVariants = cva("flex h-12 items-center gap-3", {
  variants: { state: { default: "", running: "bg-focus/5", done: "opacity-60" } },
});
```

Icons: `lucide-react` only. Size via the `size-4` / `size-5` classes, never `width`/`height` props.

## Server and client components

Default to server. `"use client"` goes on the **leaf-most** component that needs state, an effect, or an event handler — never on a page or layout as a convenience, which drags the whole subtree into the bundle.

The usual shape: a server component fetches and lays out; one interactive child is a client component.

```
page.tsx              server — prefetches via the server-side oRPC client
└── TaskList.tsx      client — has the query hook and interactions
    └── TaskRow.tsx   client — a child of a client component, no directive needed
```

`"use client"` is inherited by imports. Only the boundary file needs the directive.

## Responsive — built in, not bolted on

**The mobile layout ships in the same change as the desktop layout.** Never "desktop now, mobile later" — mobile-later means mobile-never, and the retrofit is always more expensive than doing it once.

Breakpoints (`docs/PLAN.md` §4.2):

| Width        | Layout                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- |
| `<768px`     | Bottom tab bar; rail in a drawer; detail as a full-height sheet; timer bar above the tabs |
| `768–1023px` | Rail collapses to a 64px icon strip; detail as a sheet                                    |
| `≥1024px`    | 240px rail · 720px content column · 320px detail panel                                    |

Write mobile-first: unprefixed classes are the phone, `md:` and `lg:` add to them.

```tsx
<div className="px-4 md:px-6 lg:grid lg:grid-cols-[240px_1fr]">
```

**Some layouts need a different structure, not different classes.** Week view is seven columns on desktop and a _vertical agenda with a day-strip selector_ on mobile — seven columns on a phone is unreadable. When the structure genuinely differs, render two components and switch on a `useMediaQuery` hook; don't torture one tree with a dozen breakpoint classes.

Always check: 390px (phone), 768px (tablet), 1440px (desktop).

## Touch

- Minimum 44px tap target. A 48px task row satisfies this; a 16px icon button does not — give it padding.
- **Anything revealed on hover must be visible or reachable on touch.** The `TaskRow` play button appears on hover on desktop and is always visible on touch. Hover-only is invisible on a phone.
- No hover-only tooltips carrying information that isn't available another way.

## Every list gets four states

Write all four when you write the list, not as a follow-up:

1. **Loading** — a skeleton matching the real layout's shape and height. Never a spinner in place of content; layout shift on load is worse than a slightly longer wait.
2. **Error** — what failed and a retry action. Never a bare "Something went wrong".
3. **Empty** — one line of copy and exactly one action. No illustration. A blank Inbox should read as earned, not broken.
4. **Loaded**

Empty copy is specific and calm: "Nothing scheduled for today." + `Add a task` — not "No items found."

## Conditional rendering

Three tools, and the compiler tells you which one you're allowed to use.

**`<If condition={…}>`** (`apps/web/src/components/If.tsx`) for a boolean guard — where the condition is a predicate and the children don't depend on it being true:

```tsx
<If condition={weekOffset !== 0}>
  <Button onClick={() => setWeekOffset(0)}>This week</Button>
</If>
```

**`{value && …}`** where the condition is doing _narrowing_ work:

```tsx
<>
  {area && <AreaDot color={area.color} />}
  {nowMinute !== null && <NowLine offsetPct={minuteToOffsetPct(nowMinute, window)} />}
</>
```

**A ternary or an early return** for a genuine either/or. `<If>` has no `else`, and writing the condition twice — once negated — is two sources of truth that drift.

### Why you can't get this wrong

`condition` is typed as strict `boolean`, never truthy. Two facts make that load-bearing: JSX children are evaluated as arguments _before_ `<If>` runs, so it cannot short-circuit them; and TypeScript cannot narrow across a component boundary. The strict type turns both into compile errors:

```tsx
<If condition={area}>            // ✗ 'Area | undefined' is not 'boolean'
<If condition={Boolean(area)}>   // ✓ — but `area.color` inside still errors
```

So if a conversion to `<If>` fails to compile, that is the answer, not an obstacle: leave it as `&&` and add a one-line comment saying why.

The single hole is a `!` assertion inside an `<If>` — it typechecks and then crashes. An ESLint rule in `tooling/eslint-config/next.js` catches it.

## Forms

`react-hook-form` with a `zodResolver` pointing at the schema from `@lifedesk/contracts` — the same schema the server enforces, so client and server can't drift.

Validate on blur, show errors on submit. Disable the submit button while pending; never lock the whole form.

## Accessibility

Non-negotiable, and cheap if done as you go:

- Every interactive element is reachable and operable by keyboard, with a visible focus ring
- Icon-only buttons carry `aria-label`
- The running timer is announced via a polite live region — the elapsed value itself is not (it would announce every second)
- Colour is never the only signal: the running state also carries an icon and text label, not just `--focus` green
- shadcn primitives are built on Radix — use them rather than hand-rolling a dialog, popover, or menu

## Performance

- Memoize only after measuring. `useMemo` on a three-item array costs more than it saves.
- Keys are stable ids, never array indices.
- A list that could exceed a few hundred rows gets pagination or virtualization; don't render 2,000 task rows.
