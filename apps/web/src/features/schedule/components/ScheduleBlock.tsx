"use client";

import { formatMinuteOfDay, minuteToOffsetPct, spanToHeightPct } from "@lifedesk/core/time";
import type { DayWindow } from "@lifedesk/core/time";
import type { PositionedItem } from "@lifedesk/core/schedule";
import { AREA_COLOR_VAR } from "@lifedesk/ui/lib/area-colors";
import { cn } from "@lifedesk/ui/lib/utils";
import type { CSSProperties } from "react";

import { MIN_BLOCK_PX } from "../constants";
import type { GridItem } from "../types";

/**
 * One block on the grid.
 *
 * Fill carries the area colour at low alpha with a solid left edge — the one
 * place a fill is allowed, because on a time grid fill is how duration is
 * perceived. The alpha lives in `.schedule-block` in globals.css so it can be
 * tuned in one place for both themes.
 */
export function ScheduleBlock({
  item,
  window,
  heightPx,
  onSelect,
}: {
  item: PositionedItem<GridItem>;
  window: DayWindow;
  /** Column height, so a short block can be detected and simplified. */
  heightPx: number;
  onSelect?: (item: GridItem) => void;
}) {
  const topPct = minuteToOffsetPct(item.startMin, window);
  const heightPct = spanToHeightPct(item.startMin, item.endMin, window);
  const isShort = (heightPct / 100) * heightPx < MIN_BLOCK_PX;

  const timeLabel = `${formatMinuteOfDay(item.startMin)}–${formatMinuteOfDay(item.endMin)}`;

  const style: CSSProperties & Record<"--block-color", string> = {
    top: `${topPct}%`,
    height: `${heightPct}%`,
    // Lanes split the column so overlapping blocks sit side by side. The 2px
    // gutter keeps two adjacent blocks visually distinct.
    left: `calc(${(item.lane / item.laneCount) * 100}% + 2px)`,
    width: `calc(${(1 / item.laneCount) * 100}% - 4px)`,
    "--block-color": item.color ? AREA_COLOR_VAR[item.color] : "var(--muted-foreground)",
  };

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      style={style}
      title={`${item.title} · ${timeLabel}`}
      className={cn(
        "schedule-block focus-visible:ring-ring absolute overflow-hidden rounded-md px-1.5 py-1 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
        item.isDone && "opacity-55",
        // The running session is the one thing allowed to use --focus.
        item.isRunning && "ring-focus ring-2",
      )}
    >
      <span
        className={cn(
          "block truncate text-[11px] leading-tight font-medium",
          item.isDone && "line-through",
        )}
      >
        {item.title}
      </span>

      {!isShort && (
        <span className="text-muted-foreground block truncate text-[10px] tabular-nums">
          {timeLabel}
          {item.subtitle && ` · ${item.subtitle}`}
        </span>
      )}
    </button>
  );
}
