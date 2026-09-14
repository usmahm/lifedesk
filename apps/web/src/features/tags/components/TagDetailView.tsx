"use client";

import type { AreaColor, TaskWithMeta } from "@lifedesk/contracts";
import { AREA_COLORS } from "@lifedesk/contracts";
import { Button } from "@lifedesk/ui/components/button";
import { Input } from "@lifedesk/ui/components/input";
import { Separator } from "@lifedesk/ui/components/separator";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { AREA_COLOR_LABEL, AREA_COLOR_VAR } from "@lifedesk/ui/lib/area-colors";
import { cn } from "@lifedesk/ui/lib/utils";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { If } from "@/components/If";
import { TaskDetailSheet } from "@/features/tasks/components/TaskDetailSheet";
import { TaskList } from "@/features/tasks/components/TaskList";
import { useTasks } from "@/features/tasks/hooks/useTasks";

import { TAG_NAME_MAX_LENGTH } from "../constants";
import { useDeleteTag, useTags, useUpdateTag } from "../hooks/useTagMutations";

/**
 * Everything carrying one tag.
 *
 * There is no `tag.get` procedure and none is needed — `tag.list` is a short,
 * already-cached list, so the tag is found in it rather than fetched again.
 */
export function TagDetailView({ tagId }: { tagId: string }) {
  const router = useRouter();
  const tags = useTags();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const open = useTasks({ tagId, status: ["todo", "doing"] });
  const done = useTasks({ tagId, status: ["done"] });

  const [openTask, setOpenTask] = useState<TaskWithMeta | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  if (tags.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (tags.isError) {
    return (
      <ErrorState
        title="Couldn't load your tags."
        detail={tags.error.message}
        onRetry={() => void tags.refetch()}
      />
    );
  }

  const tag = tags.data.find((candidate) => candidate.id === tagId);

  if (!tag) {
    return (
      <ErrorState
        title="That tag doesn't exist."
        detail="It may have been deleted."
        onRetry={() => router.push("/areas")}
      />
    );
  }

  const doneTasks = done.data?.items ?? [];
  const selected = openTask
    ? ([...(open.data?.items ?? []), ...doneTasks].find((t) => t.id === openTask.id) ?? openTask)
    : null;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href="/areas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Areas
        </Link>

        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: AREA_COLOR_VAR[tag.color] }}
          />
          <Input
            ref={nameRef}
            key={tag.name}
            defaultValue={tag.name}
            maxLength={TAG_NAME_MAX_LENGTH}
            aria-label="Tag name"
            onBlur={() => {
              const next = nameRef.current?.value.trim() ?? "";
              if (next && next !== tag.name) updateTag.mutate({ id: tag.id, name: next });
            }}
            onKeyDown={(event) => event.key === "Enter" && nameRef.current?.blur()}
            className="h-auto border-transparent bg-transparent px-1 font-serif !text-3xl shadow-none hover:border-border focus-visible:border-ring md:!text-4xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {AREA_COLORS.map((color: AreaColor) => (
            <button
              key={color}
              type="button"
              aria-label={AREA_COLOR_LABEL[color]}
              aria-pressed={color === tag.color}
              onClick={() => updateTag.mutate({ id: tag.id, color })}
              className={cn(
                "size-5 rounded-full border-2 transition-transform hover:scale-110",
                color === tag.color ? "border-foreground" : "border-transparent",
              )}
              style={{ background: AREA_COLOR_VAR[color] }}
            />
          ))}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Open tasks
        </h2>
        <TaskList
          tasks={open.data?.items}
          isPending={open.isPending}
          isError={open.isError}
          error={open.error}
          onRetry={() => void open.refetch()}
          emptyTitle="Nothing open with this tag."
          onOpenTask={setOpenTask}
        />
      </section>

      <If condition={doneTasks.length > 0}>
        <section className="space-y-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Completed · {doneTasks.length}
          </h2>
          <TaskList
            tasks={doneTasks}
            isPending={false}
            isError={false}
            error={null}
            onRetry={() => void done.refetch()}
            emptyTitle="Nothing completed yet."
            onOpenTask={setOpenTask}
          />
        </section>
      </If>

      <Separator />

      <Button
        variant="ghost"
        size="sm"
        className="gap-2 px-0 text-destructive hover:text-destructive"
        onClick={() => deleteTag.mutate({ id: tag.id }, { onSuccess: () => router.push("/areas") })}
      >
        <Trash2 className="size-3.5" />
        Delete tag
      </Button>

      <TaskDetailSheet task={selected} onOpenChange={(isOpen) => !isOpen && setOpenTask(null)} />
    </div>
  );
}
