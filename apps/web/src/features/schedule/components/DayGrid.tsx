"use client";

import type { CalendarDay } from "@lifedesk/contracts";
import { dayWindow, dayWindowIncluding, layoutBlocks } from "@lifedesk/core/schedule";
import { minuteToOffsetPct } from "@lifedesk/core/time";
import { cn } from "@lifedesk/ui/lib/utils";
import { useRef } from "react";

import {
  AXIS_WIDTH_PX,
  DEFAULT_BLOCK_MINUTES,
  PX_PER_HOUR,
  SLOT_SNAP_MINUTES,
} from "../constants";
import { useNowMinute } from "../hooks/useNowMinute";
import type { GridDay, GridItem } from "../types";
import { ScheduleBlock } from "./ScheduleBlock";
import { HourRules, TimeAxis } from "./TimeAxis";

/**
 * The time grid. One column for Today, seven for Week.
 *
 * The visible hour window is computed across *all* days at once, so columns
 * stay aligned and a 05:30 block on Tuesday opens the axis for the whole week
 * rather than just its own column.
 */
export function DayGrid({
  days,
  timezone,
  today,
  pxPerHour = PX_PER_HOUR,
  renderHeader,
  onSelectItem,
  onSelectSlot,
  className,
}: {
  days: GridDay[];
  timezone: string | undefined;
  /** Which day gets the now-line, if any is on screen. */
  today?: CalendarDay;
  pxPerHour?: number;
  renderHeader?: (day: CalendarDay) => React.ReactNode;
  onSelectItem?: (item: GridItem) => void;
  /** Click an empty stretch to block time there. Mouse convenience only — the
   *  keyboard path is the planned-time inputs in the task detail panel. */
  onSelectSlot?: (day: CalendarDay, startMin: number, endMin: number) => void;
  className?: string;
}) {
  const nowMinute = useNowMinute(timezone);
  const showsToday = Boolean(today && days.some((d) => d.day === today));

  const allItems = days.flatMap((d) => d.items);
  const window =
    showsToday && nowMinute !== null
      ? dayWindowIncluding(allItems, nowMinute)
      : dayWindow(allItems);

  const heightPx = ((window.endMin - window.startMin) / 60) * pxPerHour;

  return (
    <div className={cn("flex flex-col", className)}>
      {renderHeader && (
        <div className="flex" style={{ paddingLeft: AXIS_WIDTH_PX }}>
          {days.map((d) => (
            <div key={d.day} className="min-w-0 flex-1 px-1">
              {renderHeader(d.day)}
            </div>
          ))}
        </div>
      )}

      <div className="flex" style={{ height: heightPx }}>
        <TimeAxis window={window} />

        <div className="relative min-w-0 flex-1">
          <HourRules window={window} />

          <div className="absolute inset-0 flex">
            {days.map((d) => (
              <DayColumn
                key={d.day}
                day={d}
                window={window}
                heightPx={heightPx}
                isToday={d.day === today}
                nowMinute={nowMinute}
                onSelectItem={onSelectItem}
                onSelectSlot={onSelectSlot}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  window,
  heightPx,
  isToday,
  nowMinute,
  onSelectItem,
  onSelectSlot,
}: {
  day: GridDay;
  window: { startMin: number; endMin: number };
  heightPx: number;
  isToday: boolean;
  nowMinute: number | null;
  onSelectItem?: (item: GridItem) => void;
  onSelectSlot?: (day: CalendarDay, startMin: number, endMin: number) => void;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const positioned = layoutBlocks(day.items);

  function handleClick(event: React.MouseEvent<HTMLDivElement>): void {
    if (!onSelectSlot) return;
    // Clicks on a block are its own; only bare column area creates.
    if (event.target !== event.currentTarget) return;

    const box = columnRef.current?.getBoundingClientRect();
    if (!box || box.height === 0) return;

    const ratio = (event.clientY - box.top) / box.height;
    const rawMinute = window.startMin + ratio * (window.endMin - window.startMin);
    const startMin =
      Math.floor(rawMinute / SLOT_SNAP_MINUTES) * SLOT_SNAP_MINUTES;

    onSelectSlot(
      day.day,
      Math.max(window.startMin, startMin),
      Math.min(window.endMin, startMin + DEFAULT_BLOCK_MINUTES),
    );
  }

  return (
    <div
      ref={columnRef}
      onClick={handleClick}
      className={cn(
        "border-border/50 relative min-w-0 flex-1 border-l first:border-l-0",
        onSelectSlot && "cursor-copy",
      )}
    >
      {positioned.map((item) => (
        <ScheduleBlock
          key={item.id}
          item={item}
          window={window}
          heightPx={heightPx}
          onSelect={onSelectItem}
        />
      ))}

      {isToday && nowMinute !== null && nowMinute >= window.startMin && nowMinute <= window.endMin && (
        <NowLine offsetPct={minuteToOffsetPct(nowMinute, window)} />
      )}
    </div>
  );
}

/** Where you are in the day. The one hairline allowed to use --focus. */
function NowLine({ offsetPct }: { offsetPct: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10"
      style={{ top: `${offsetPct}%` }}
      aria-hidden
    >
      <div className="bg-focus h-px w-full" />
      <div className="bg-focus absolute -top-[3px] left-0 size-[7px] rounded-full" />
    </div>
  );
}
