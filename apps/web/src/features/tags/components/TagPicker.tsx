"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { Button } from "@lifedesk/ui/components/button";
import { Input } from "@lifedesk/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@lifedesk/ui/components/popover";
import { AREA_COLOR_VAR } from "@lifedesk/ui/lib/area-colors";
import { Check, Plus } from "lucide-react";
import { useState } from "react";

import { If } from "@/components/If";

import { nextTagColor, TAG_NAME_MAX_LENGTH } from "../constants";
import { useCreateTag, useSetTaskTags, useTags } from "../hooks/useTagMutations";
import { TagChip } from "./TagChip";

/**
 * Assigning tags to a task, and creating one without leaving the thought.
 *
 * Tags are the cross-cutting axis — an area says where work belongs, a tag
 * says what kind of work it is. Creating one happens mid-edit, so it takes a
 * name and nothing else; the colour is assigned from the palette and changed
 * later on the tag's own page, if ever.
 */
export function TagPicker({ task }: { task: TaskWithMeta }) {
  const tags = useTags();
  const createTag = useCreateTag();
  const setTaskTags = useSetTaskTags();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const all = tags.data ?? [];
  const selected = all.filter((tag) => task.tagIds.includes(tag.id));

  const query = search.trim().toLowerCase();
  const matches = query ? all.filter((tag) => tag.name.toLowerCase().includes(query)) : all;
  const exactExists = all.some((tag) => tag.name.toLowerCase() === query);

  function toggle(tagId: string) {
    const next = task.tagIds.includes(tagId)
      ? task.tagIds.filter((id) => id !== tagId)
      : [...task.tagIds, tagId];

    setTaskTags.mutate({ id: task.id, tagIds: next });
  }

  function create() {
    const name = search.trim();
    if (!name) return;

    createTag.mutate(
      { name, color: nextTagColor(all.length) },
      {
        onSuccess: (tag) => {
          setSearch("");
          // Attach it immediately — creating a tag from inside a task always
          // means "and put it on this one".
          setTaskTags.mutate({ id: task.id, tagIds: [...task.tagIds, tag.id] });
        },
      },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((tag) => (
        <button
          key={tag.id}
          type="button"
          aria-label={`Remove ${tag.name}`}
          onClick={() => toggle(tag.id)}
          className="group/tag rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <TagChip
            name={tag.name}
            color={tag.color}
            className="transition-colors group-hover/tag:border-destructive group-hover/tag:text-destructive"
          />
        </button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
            <Plus className="size-3" />
            Tag
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-64 p-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query && !exactExists) {
                event.preventDefault();
                create();
              }
            }}
            placeholder="Find or create a tag"
            aria-label="Find or create a tag"
            maxLength={TAG_NAME_MAX_LENGTH}
            className="h-8"
          />

          <div className="mt-2 max-h-56 overflow-y-auto">
            {matches.map((tag) => {
              const isOn = task.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: AREA_COLOR_VAR[tag.color] }}
                  />
                  <span className="flex-1 truncate">{tag.name}</span>
                  <If condition={isOn}>
                    <Check className="size-3.5 shrink-0 text-muted-foreground" />
                  </If>
                </button>
              );
            })}

            <If condition={query.length > 0 && !exactExists}>
              <button
                type="button"
                onClick={create}
                disabled={createTag.isPending}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                Create “{search.trim()}”
              </button>
            </If>

            <If condition={matches.length === 0 && query.length === 0}>
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No tags yet. Type a name to make one.
              </p>
            </If>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
