"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

/**
 * Project mutations.
 *
 * Deleting also invalidates tasks and sessions: both carry a `projectId` that
 * the database sets to null on delete, so their cached copies are stale the
 * moment a project goes.
 */
function useProjectInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: orpc.project.key() });
    void queryClient.invalidateQueries({ queryKey: orpc.task.key() });
    void queryClient.invalidateQueries({ queryKey: orpc.session.key() });
  };
}

export function useUpdateProject() {
  const invalidate = useProjectInvalidation();

  return useMutation(
    orpc.project.update.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useDeleteProject() {
  const invalidate = useProjectInvalidation();

  return useMutation(
    orpc.project.remove.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}
