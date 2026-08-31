"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

/**
 * Starting and stopping the clock.
 *
 * Both invalidate the same set: the running session, today's total, and the
 * task lists (a task's tracked time changes when a session ends).
 */
function useTimerInvalidation() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.session.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
    ]);
  };
}

export function useStartTimer() {
  const invalidate = useTimerInvalidation();

  return useMutation(
    orpc.session.start.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useStopTimer() {
  const invalidate = useTimerInvalidation();

  return useMutation(
    orpc.session.stop.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}
