"use client";

import type { TaskWithMeta } from "@lifedesk/contracts";
import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { Input } from "@lifedesk/ui/components/input";
import { Separator } from "@lifedesk/ui/components/separator";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { If } from "@/components/If";
import { ErrorState } from "@/components/ErrorState";
import { QuickAdd } from "@/features/tasks/components/QuickAdd";
import { TaskDetailSheet } from "@/features/tasks/components/TaskDetailSheet";
import { TaskList } from "@/features/tasks/components/TaskList";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { orpc } from "@/lib/orpc/client";

export function AreaDetailView({ areaId }: { areaId: string }) {
  const queryClient = useQueryClient();
  const area = useQuery(orpc.area.get.queryOptions({ input: { id: areaId } }));
  const projects = useQuery(
    orpc.project.list.queryOptions({ input: { areaId, includeArchived: false } }),
  );
  const tasks = useTasks({ areaId, status: ["todo", "doing"] });

  const [projectName, setProjectName] = useState("");
  const [openTask, setOpenTask] = useState<TaskWithMeta | null>(null);

  const createProject = useMutation(
    orpc.project.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.project.key() }),
      onError: (error) => toast.error(error.message),
    }),
  );

  if (area.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (area.isError) {
    return (
      <ErrorState
        title="Couldn't load that area."
        detail={area.error.message}
        onRetry={() => void area.refetch()}
      />
    );
  }

  function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    const trimmed = projectName.trim();
    if (!trimmed) return;

    setProjectName("");
    createProject.mutate({
      areaId,
      name: trimmed,
      description: null,
      startDate: null,
      dueDate: null,
    });
  }

  const selected = openTask
    ? (tasks.data?.items.find((t) => t.id === openTask.id) ?? openTask)
    : null;

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <AreaDot color={area.data.color} label={area.data.name} className="size-2.5" />
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">{area.data.name}</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Projects
        </h2>

        <form onSubmit={handleCreateProject} className="relative">
          <Plus
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Add a project"
            aria-label="Add a project"
            className="h-10 pl-9"
          />
        </form>

        {projects.isPending ? (
          <Skeleton className="h-10" />
        ) : projects.data && projects.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {projects.data.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex h-11 items-center gap-3 text-sm hover:text-foreground/80"
                >
                  <span className="flex-1 truncate">{project.name}</span>
                  <If condition={project.status !== "active"}>
                    <span className="text-xs text-muted-foreground">{project.status}</span>
                  </If>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">No projects in this area yet.</p>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Open tasks
        </h2>

        <QuickAdd areaId={areaId} placeholder={`Add to ${area.data.name}`} />

        <TaskList
          tasks={tasks.data?.items}
          isPending={tasks.isPending}
          isError={tasks.isError}
          error={tasks.error}
          onRetry={() => void tasks.refetch()}
          emptyTitle="Nothing open in this area."
          onOpenTask={setOpenTask}
        />
      </section>

      <TaskDetailSheet task={selected} onOpenChange={(open) => !open && setOpenTask(null)} />
    </div>
  );
}
