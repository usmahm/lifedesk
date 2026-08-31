import { formatMinuteOfDay, hoursInWindow, minuteToOffsetPct } from "@lifedesk/core/time";
import type { DayWindow } from "@lifedesk/core/time";

import { AXIS_WIDTH_PX } from "../constants";

/**
 * The hour gutter.
 *
 * Labels sit above their rule and are nudged up half a line so the text reads
 * as marking the boundary rather than the band below it.
 */
export function TimeAxis({ window }: { window: DayWindow }) {
  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: AXIS_WIDTH_PX }}
      aria-hidden
    >
      {hoursInWindow(window).map((hour) => (
        <span
          key={hour}
          className="text-muted-foreground/70 absolute right-2 -translate-y-1/2 text-[11px] tabular-nums"
          style={{ top: `${minuteToOffsetPct(hour * 60, window)}%` }}
        >
          {formatMinuteOfDay(hour * 60)}
        </span>
      ))}
    </div>
  );
}

/**
 * Hairline rules behind every column at once, so they line up across days.
 *
 * Hairlines, not cell borders — a bordered grid reads as a spreadsheet, which
 * is exactly the thing to avoid here.
 */
export function HourRules({ window }: { window: DayWindow }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {hoursInWindow(window).map((hour) => (
        <div
          key={hour}
          className="border-border/50 absolute inset-x-0 border-t"
          style={{ top: `${minuteToOffsetPct(hour * 60, window)}%` }}
        />
      ))}
    </div>
  );
}
