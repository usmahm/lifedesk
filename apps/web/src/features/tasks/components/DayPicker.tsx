"use client";

import type { CalendarDay } from "@lifedesk/contracts";
import {
  addDays,
  calendarDayToLocalDate,
  formatDayRelative,
  localDateToCalendarDay,
} from "@lifedesk/core/time";
import { Button } from "@lifedesk/ui/components/button";
import { Calendar } from "@lifedesk/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@lifedesk/ui/components/popover";
import { Separator } from "@lifedesk/ui/components/separator";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

/**
 * Move a task to a day.
 *
 * This is how rescheduling works in Phase 1 — drag-and-drop is deferred, and
 * a date picker is the accessible, keyboard-reachable path regardless.
 *
 * The calendar works in local `Date`s; we convert at this boundary only, so a
 * CalendarDay never becomes a timestamp. See .claude/rules/dates-and-timezones.md.
 */
export function DayPicker({
  value,
  today,
  onChange,
}: {
  value: CalendarDay | null;
  today: CalendarDay | undefined;
  onChange: (day: CalendarDay | null) => void;
}) {
  const [open, setOpen] = useState(false);

  function pick(day: CalendarDay | null) {
    onChange(day);
    setOpen(false);
  }

  const label = value ? (today ? formatDayRelative(value, today) : value) : "Not scheduled";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal">
          <CalendarDays className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        {today && (
          <>
            <div className="flex flex-col p-1">
              <Button variant="ghost" size="sm" className="justify-start" onClick={() => pick(today)}>
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => pick(addDays(today, 1))}
              >
                Tomorrow
              </Button>
              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground justify-start"
                  onClick={() => pick(null)}
                >
                  Move to inbox
                </Button>
              )}
            </div>
            <Separator />
          </>
        )}

        <Calendar
          mode="single"
          autoFocus
          selected={value ? calendarDayToLocalDate(value) : undefined}
          onSelect={(date) => pick(date ? localDateToCalendarDay(date) : null)}
        />
      </PopoverContent>
    </Popover>
  );
}
