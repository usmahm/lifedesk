# Design tokens

The visual system. Direction is **Calm workspace**: warm paper ground, generous whitespace, quiet typography, a single accent. It should read like a well-made notebook, not a dashboard — the app is used during long research sessions where visual noise is the enemy.

Full rationale in `docs/PLAN.md` §4.

## The four principles

1. **One thing is loudest.** On Day, that's the intention line and the running timer. Everything else recedes. A screen where six things compete is a screen you avoid opening.
2. **Time is shown, never calculated.** Render "3h 15m planned of 6h" — never make the user add up estimates. That's the app's entire job.
3. **Empty is a designed state.** Every list gets real copy and exactly one action.
4. **Nothing moves that the user didn't move.** Motion confirms causality. No decorative animation.

## Colour

Tokens live in `packages/ui/src/styles/globals.css` as shadcn CSS variables. Base palette is shadcn `stone`; primary is a muted clay.

```css
:root {
  --background: oklch(0.99 0.004  85);  /* warm paper   */
  --foreground: oklch(0.22 0.008  75);
  --muted:      oklch(0.96 0.006  85);
  --border:     oklch(0.92 0.006  85);
  --primary:    oklch(0.55 0.13   40);  /* clay         */
  --focus:      oklch(0.62 0.11  155);  /* session live */
}
.dark {
  --background: oklch(0.18 0.006  70);
  --foreground: oklch(0.93 0.006  85);
  --muted:      oklch(0.24 0.008  70);
  --border:     oklch(0.30 0.008  70);
  --primary:    oklch(0.68 0.13   42);
  --focus:      oklch(0.70 0.12  155);
}
```

### Two hard rules

**1. Area colour is a 3px left edge or a 6px dot. Never a filled background — outside the time grid.**

Filled colour backgrounds turn any list of eight items into a fruit salad, and they're the single fastest way to lose the calm. The area's identity needs to be *findable*, not *loud*.

```tsx
// good
<span className="size-1.5 rounded-full" style={{ background: area.color }} />
<div className="border-l-[3px]" style={{ borderColor: area.color }}>

// never, in a list row
<div style={{ background: area.color }}>
```

**The one exception: blocks on the time grid.** There, fill is how duration is *perceived* — a three-hour block drawn as a hairline outline is unreadable, and the eye needs area to read as time. Grid blocks use the `.schedule-block` class in `globals.css`: area colour at ~12% alpha (22% dark) with a solid 3px left edge.

The alpha lives in that one class on purpose. **If a day holding six different areas starts reading like a spreadsheet, lower it there** — that is the failure mode to watch, and most calendar UIs are on the wrong side of it. Hour markers stay hairlines and grid cells get no borders; a bordered grid is what makes a calendar feel like a spreadsheet.

**2. `--focus` green means exactly one thing: a session is running.**

Not a success toast. Not a valid input. Not a completed task. Not a positive trend on a chart. That reservation is the whole reason peripheral vision can tell you the clock is going without you looking directly at it — and it's destroyed the first time green means something else.

Completed tasks use muted foreground. Success toasts use the default foreground. Positive deltas in charts use the neutral scale.

### Area palette

Fixed eight hues, so an area looks identical in every list, panel, and chart. Never generate an area colour randomly, and never let two areas share one.

`clay · amber · olive · teal · indigo · plum · rose · slate`

Defined once in `packages/ui/src/lib/area-colors.ts`. Reference by key, never by hex at a call site.

### Using colour

Always through semantic tokens: `bg-background`, `text-muted-foreground`, `border-border`. Never a raw Tailwind palette class (`bg-stone-100`, `text-gray-500`) in a component — those break dark mode and can't be retuned centrally.

## Typography

**Geist Sans** for the interface (Inter fallback). **Instrument Serif** for exactly two things: the date header and the day's intention line. That single pairing carries the notebook feeling; using the serif anywhere else spends it for nothing.

- Scale: `12 / 13 / 14 / 16 / 20 / 28 / 40`. **Body is 14**, not 16.
- Timer display: 40px, tabular, `font-medium` — never bold.
- Headings are weight and size, not colour. Don't tint a heading to make it feel important.

### Tabular numerals — non-negotiable

**Every number that changes over time or sits in a column gets `tabular-nums`.** Timers, durations, totals, chart axes, capacity figures.

A counting clock rendered with proportional digits shifts width on every tick, and once you've noticed the jitter you can't unsee it.

```tsx
<span className="tabular-nums">{formatElapsed(seconds)}</span>
```

## Spacing

4px base, 8px grid. Tailwind's default scale, restricted to even steps (`2 / 4 / 6 / 8 / 12 / 16`) — odd values are usually a sign something else is misaligned.

- Content column: `max-w-[720px]`, gutters `px-6` desktop / `px-4` mobile
- Task row: `h-12` (48px), which also satisfies the 44px minimum tap target
- Section gaps: `space-y-6` between blocks, `space-y-1` within a list

Generous whitespace is a feature here, not slack. When in doubt, more.

## Motion

- 150ms `ease-out` for state changes; 200ms for sheets and panels
- **Timer digits never animate.** No count-up transitions, no flip effects
- **Completing a task:** check draws over 200ms, then the row fades and collapses over 400ms — slow enough to see it happen, fast enough not to block the next completion
- Every animation respects `prefers-reduced-motion`; the reduced path is instant, not merely faster

No decorative motion. Nothing pulses, floats, shimmers, or draws attention on its own schedule. The one exception is the running-session indicator, which may breathe slowly — it's reporting live state, so it earns it.

## Borders and elevation

Flat. `border-border` hairlines separate regions; shadows are reserved for things that genuinely float above the page (sheets, popovers, the PiP timer). No card shadows in lists.

Radius: `rounded-lg` for containers, `rounded-md` for controls, `rounded-full` only for dots and avatars.

## Dark mode

Designed, not inverted. Every token has a hand-tuned dark value; never derive one by flipping lightness. Check every screen in both themes in the same change — dark mode is most of the point, since evening work is when this app gets used.
