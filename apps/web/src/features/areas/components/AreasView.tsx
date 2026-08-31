"use client";

import { AREA_COLOR_OPTIONS, nextAreaColor } from "@lifedesk/ui/lib/area-colors";
import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { EmptyState } from "@lifedesk/ui/components/domain/empty-state";
import { Input } from "@lifedesk/ui/components/input";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/ErrorState";
import { orpc } from "@/lib/orpc/client";

export function AreasView() {
  const queryClient = useQueryClient();
  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: false } }));
  const projects = useQuery(
    orpc.project.list.queryOptions({ input: { includeArchived: false } }),
  );

  const [name, setName] = useState("");

  const createArea = useMutation(
    orpc.area.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.area.key() }),
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setName("");
    createArea.mutate({
      name: trimmed,
      // Never two areas the same colour — an area's colour is its identity.
      color: nextAreaColor(areas.data?.map((a) => a.color) ?? []),
      icon: null,
    });
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">Areas</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The long-lived buckets your work falls into.
        </p>
      </header>

      <form onSubmit={handleCreate} className="relative">
        <Plus
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add an area"
          aria-label="Add an area"
          className="h-11 pl-9"
        />
      </form>

      {areas.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : areas.isError ? (
        <ErrorState
          title="Couldn't load your areas."
          detail={areas.error.message}
          onRetry={() => void areas.refetch()}
        />
      ) : areas.data.length === 0 ? (
        <EmptyState title="No areas yet. Research, Work, Health — whatever your life actually splits into." />
      ) : (
        <ul className="divide-border divide-y">
          {areas.data.map((area) => {
            const count =
              projects.data?.filter((project) => project.areaId === area.id).length ?? 0;

            return (
              <li key={area.id}>
                <Link
                  href={`/areas/${area.id}`}
                  className="hover:bg-accent/40 focus-visible:ring-ring -mx-2 flex h-14 items-center gap-3 rounded-md px-2 transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <AreaDot color={area.color} label={area.name} className="size-2" />
                  <span className="flex-1 truncate text-sm font-medium">{area.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {count === 0 ? "No projects" : count === 1 ? "1 project" : `${count} projects`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">
        {AREA_COLOR_OPTIONS.length} colours available — each new area takes the next unused one.
      </p>
    </div>
  );
}
