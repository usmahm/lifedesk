"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

/**
 * Task mutations.
 *
 * Anything the user expects to feel instant gets an optimistic update —
 * ticking a checkbox that waits for a round trip feels broken even when it's
 * fast. See .claude/rules/data-access.md.
 */

function useTaskInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: orpc.task.key() });
}

export function useCreateTask() {
  const invalidate = useTaskInvalidation();

  return useMutation(
    orpc.task.create.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useUpdateTask() {
  const invalidate = useTaskInvalidation();

  return useMutation(
    orpc.task.update.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useSetTaskComplete() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.task.setComplete.mutationOptions({
      onMutate: async (variables) => {
        // Stop in-flight refetches from overwriting the optimistic state.
        await queryClient.cancelQueries({ queryKey: orpc.task.key() });
        const snapshot = queryClient.getQueriesData({ queryKey: orpc.task.key() });

        queryClient.setQueriesData<{ items: { id: string; status: string }[] }>(
          { queryKey: orpc.task.list.key() },
          (old) =>
            old && {
              ...old,
              items: old.items.map((task) =>
                task.id === variables.id
                  ? { ...task, status: variables.complete ? "done" : "todo" }
                  : task,
              ),
            },
        );

        return { snapshot };
      },
      onError: (error, _variables, context) => {
        for (const [key, data] of context?.snapshot ?? []) {
          queryClient.setQueryData(key, data);
        }
        toast.error(error.message);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
    }),
  );
}

export function useScheduleTask() {
  const invalidate = useTaskInvalidation();

  return useMutation(
    orpc.task.schedule.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useSetTaskPlannedTime() {
  const invalidate = useTaskInvalidation();

  return useMutation(
    orpc.task.setPlannedTime.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useDeleteTask() {
  const invalidate = useTaskInvalidation();

  return useMutation(
    orpc.task.remove.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}
