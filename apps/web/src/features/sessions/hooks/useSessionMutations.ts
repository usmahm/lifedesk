"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

/**
 * Session mutations.
 *
 * Tasks are invalidated alongside sessions because `trackedSec` lives on the
 * task — add an hour by hand and the task's tracked total is stale until it
 * refetches.
 */
function useSessionInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: orpc.session.key() });
    void queryClient.invalidateQueries({ queryKey: orpc.task.key() });
  };
}

export function useCreateSession() {
  const invalidate = useSessionInvalidation();

  return useMutation(
    orpc.session.create.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useUpdateSession() {
  const invalidate = useSessionInvalidation();

  return useMutation(
    orpc.session.update.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}
