"use client";

import type { CalendarDay, CreateTaskInput } from "@lifedesk/contracts";
import { Input } from "@lifedesk/ui/components/input";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useCreateTask } from "../hooks/useTaskMutations";

/**
 * Capture, deliberately simple.
 *
 * Type a title, press Enter, and it's created in the current context. No
 * natural-language parsing: a parser that's wrong 15% of the time is worse
 * than no parser, because you have to check every result. Area, project, and
 * estimate are set in the detail panel, where there's room to be explicit.
 *
 * Speed of capture is the single biggest determinant of whether a tool gets
 * used at all, so this stays one field.
 */
export function QuickAdd({
  scheduledFor,
  areaId,
  projectId,
  placeholder = "Add a task",
}: {
  scheduledFor?: CalendarDay | null;
  areaId?: string | null;
  projectId?: string | null;
  placeholder?: string;
}) {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) return;

    const input: CreateTaskInput = { title: trimmed };
    if (scheduledFor) input.scheduledFor = scheduledFor;
    if (areaId) input.areaId = areaId;
    if (projectId) input.projectId = projectId;

    // Cleared immediately so you can keep typing the next one.
    setTitle("");
    createTask.mutate(input);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Plus
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 pl-9"
        enterKeyHint="done"
      />
    </form>
  );
}
