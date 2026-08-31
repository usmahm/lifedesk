# Dates and timezones

This is the trap that quietly ruins planning apps. Get it wrong and tasks show up on the wrong day after a flight, "today" flips at the wrong hour, and a tracked session lands in yesterday's total. It is miserable to retrofit, so the discipline is absolute from day one.

## The model

**Two distinct kinds of value. Never confuse them.**

| Kind | Example fields | Stored as | Meaning |
|---|---|---|---|
| **Instant** | `startedAt`, `endedAt`, `completedAt`, `createdAt` | UTC timestamp | A precise moment on the world clock |
| **Calendar day** | `scheduledFor`, `dueDate` | `YYYY-MM-DD` string | A day in *the user's* calendar, with no time and no zone |

A calendar day is **not** a timestamp at midnight. "Scheduled for Thursday" means Thursday wherever the user is — it does not shift when they fly to Lagos. Storing it as `2026-08-30T00:00:00Z` is the bug, because in UTC-5 that renders as Wednesday evening.

In TypeScript these are different types, and the compiler enforces it:

```ts
type Instant = Date;        // always UTC
type CalendarDay = string;  // branded "YYYY-MM-DD" — see packages/core/time
```

## Everything goes through `packages/core/time`

No date library is imported directly in a component, a procedure, or a repository. `date-fns` and `date-fns-tz` are dependencies of `packages/core` only. Everything else imports named functions:

```ts
import { todayIn, formatElapsed, toCalendarDay, startOfWeekIn } from "@lifedesk/core/time";
```

One module means one place to fix a bug and one place to test DST. Scattered `format()` calls mean the same bug in nine places.

## Never `new Date()` in a component

```tsx
// never — this is the user's browser clock, unbranded, untestable,
// and it makes the component non-deterministic in tests and mismatched in SSR
const today = new Date();
if (task.dueDate < new Date()) { ... }
```

```tsx
// good — "now" is passed in or comes from a hook that owns it
const today = useToday();               // CalendarDay in the user's tz
const isOverdue = isBeforeDay(task.dueDate, today);
```

Reasons this matters beyond tidiness:

- **Hydration mismatch.** The server renders one date, the browser another, React warns and the DOM is wrong.
- **The user's timezone is not the browser's timezone.** It's the one stored in `UserSettings.timezone`. Someone travelling wants their plan to stay in their home schedule unless they change it.
- **Untestable.** You can't test "what happens at 11:58pm on a DST boundary" against a clock you can't inject.

## "Today" is a user-scoped question

```ts
todayIn(userSettings.timezone)   // → CalendarDay
```

Never `startOfDay(new Date())`. The day boundary belongs to the user's zone, not the server's (UTC on Vercel) or the browser's.

Same for week boundaries — `weekStartsOn` is a user setting, so `startOfWeekIn(tz, weekStartsOn)`, never a hardcoded Monday.

## Durations

Stored as **integer seconds** (`durationSec`), never as floats, and never as a formatted string. Formatting happens at the render edge only.

Elapsed time for a *running* session is always **derived from `startedAt`**, never accumulated in a client interval:

```ts
// good — survives refresh, tab close, laptop sleep, a second device
const elapsedSec = differenceInSeconds(serverNow(), session.startedAt);

// never — drifts, resets on refresh, and silently loses time when the tab sleeps
setInterval(() => setElapsed((e) => e + 1), 1000);
```

A `setInterval` may drive the *re-render*, but the value it displays is always recomputed from `startedAt`. That's the difference between a timer you trust and one you don't.

Clients also correct for clock skew: the server's time is sampled once and an offset applied, so a user with a wrong system clock still sees correct elapsed time.

## Rendering

- Durations: `formatDuration(sec)` → `2h 15m`, `45m`, `1h`. Never `2.25 hours`, never `02:15:00` outside the timer itself.
- Running timer: `formatElapsed(sec)` → `00:42:17`. Always with `tabular-nums`.
- Dates: `formatDay(day, tz)`. Relative labels ("Today", "Tomorrow", "Yesterday") are preferred within ±1 day, absolute beyond that.

## Testing

`packages/core/time` carries unit tests for the cases that actually break:

- A day boundary crossed in a non-UTC zone
- Spring-forward and fall-back DST transitions (a "day" that is 23 or 25 hours long)
- A session started before midnight and stopped after it
- Week start on Sunday versus Monday
- A user whose stored timezone differs from the runtime's

Every function in the module takes time as an argument rather than reading a clock, which is what makes those tests possible.
