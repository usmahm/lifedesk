"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { Badge } from "@lifedesk/ui/components/badge";
import { Button } from "@lifedesk/ui/components/button";
import { Separator } from "@lifedesk/ui/components/separator";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { If } from "@/components/If";
import { QuickAdd } from "@/features/tasks/components/QuickAdd";
import { TaskDetailSheet } from "@/features/tasks/components/TaskDetailSheet";
import { TaskList } from "@/features/tasks/components/TaskList";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { orpc } from "@/lib/orpc/client";

import { useDeleteProject } from "../hooks/useProjectMutations";
import { DeleteProjectDialog } from "./DeleteProjectDialog";

/**
 * A project and everything under it.
 *
 * Unlike the area page, this shows completed work as well as open work — for a
 * project, what got finished *is* the point, and hiding it leaves the page
 * looking empty exactly when the project is going well.
 */
export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useQuery(orpc.project.get.queryOptions({ input: { id: projectId } }));
  const open = useTasks({ projectId, status: ["todo", "doing"] });
  const done = useTasks({ projectId, status: ["done"] });

  const [openTask, setOpenTask] = useState<TaskWithMeta | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const remove = useDeleteProject();

  const area = useQuery({
    ...orpc.area.get.queryOptions({ input: { id: project.data?.areaId as string } }),
    enabled: Boolean(project.data?.areaId),
  });

  if (project.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (project.isError) {
    return (
      <ErrorState
        title="Couldn't load that project."
        detail={project.error.message}
        onRetry={() => void project.refetch()}
      />
    );
  }

  const openTasks = open.data?.items ?? [];
  const doneTasks = done.data?.items ?? [];

  // Re-read from the live list so the sheet reflects edits made inside it.
  const selected = openTask
    ? ([...openTasks, ...doneTasks].find((t) => t.id === openTask.id) ?? openTask)
    : null;

  function handleDelete() {
    remove.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          setConfirmingDelete(false);
          router.push(project.data?.areaId ? `/areas/${project.data.areaId}` : "/areas");
        },
      },
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href={project.data.areaId ? `/areas/${project.data.areaId}` : "/areas"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {area.data?.name ?? "Areas"}
        </Link>

        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="font-serif text-3xl leading-tight md:text-4xl">{project.data.name}</h1>
            <If condition={project.data.description !== null}>
              <p className="text-sm text-muted-foreground">{project.data.description}</p>
            </If>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {area.data && <AreaDot color={area.data.color} label={area.data.name} />}
            <If condition={project.data.status !== "active"}>
              <Badge variant="secondary">{project.data.status}</Badge>
            </If>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Open tasks
        </h2>

        <QuickAdd projectId={projectId} placeholder={`Add to ${project.data.name}`} />

        <TaskList
          tasks={open.data?.items}
          isPending={open.isPending}
          isError={open.isError}
          error={open.error}
          onRetry={() => void open.refetch()}
          emptyTitle="Nothing open in this project."
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
        onClick={() => setConfirmingDelete(true)}
      >
        <Trash2 className="size-3.5" />
        Delete project
      </Button>

      <DeleteProjectDialog
        projectName={project.data.name}
        taskCount={openTasks.length + doneTasks.length}
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />

      <TaskDetailSheet task={selected} onOpenChange={(isOpen) => !isOpen && setOpenTask(null)} />
    </div>
  );
}
