"use client";

import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskWithMeta } from "@lifedesk/contracts";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

import type { TaskPatch } from "../types";

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

/**
 * Optimistically patch one task in every cached list.
 *
 * Fields like the estimate hold a local draft while you edit and hand it over
 * on commit. Without an optimistic write there is a round-trip-long window
 * where the draft is gone and the server value has not arrived, so the *old*
 * value shows through — type 10 over a 1 and it flashes back to 1, which reads
 * exactly like the edit was lost. The same field in the add-session dialog
 * never does this, because there `onChange` is a `useState` setter and the new
 * value is already there on the next render.
 *
 * `onMutate` runs in the same tick as the write, so the draft clearing and the
 * cache update land in one render and the window closes entirely.
 */
function useOptimisticTask() {
  const queryClient = useQueryClient();

  function patch(id: string, fields: TaskPatch) {
    const snapshot = queryClient.getQueriesData({ queryKey: orpc.task.key() });

    queryClient.setQueriesData<{ items: TaskWithMeta[] }>(
      { queryKey: orpc.task.list.key() },
      (old) =>
        old && {
          ...old,
          // Safe: only the CalendarDay brand is missing, and these values
          // were validated by Zod on the way in. See TaskPatch.
          items: old.items.map((task) =>
            task.id === id ? ({ ...task, ...fields } as TaskWithMeta) : task,
          ),
        },
    );

    // Deliberately not awaited, and deliberately after the write. Awaiting
    // cancelQueries first would put the cache update a microtask behind the
    // field clearing its draft — which is the frame where the old value shows
    // through, and the whole reason this exists. Cancelling is a best-effort
    // guard against an in-flight refetch clobbering the patch, and onSettled
    // invalidates regardless.
    void queryClient.cancelQueries({ queryKey: orpc.task.key() });

    return snapshot;
  }

  function restore(snapshot: [QueryKey, unknown][] | undefined) {
    for (const [key, data] of snapshot ?? []) queryClient.setQueryData(key, data);
  }

  return {
    patch,
    restore,
    settle: () => queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
  };
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
  const { patch, restore, settle } = useOptimisticTask();

  return useMutation(
    orpc.task.update.mutationOptions({
      onMutate: ({ id, ...fields }) => patch(id, fields),
      onError: (error, _variables, snapshot) => {
        restore(snapshot);
        toast.error(error.message);
      },
      onSettled: settle,
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
  const { patch, restore, settle } = useOptimisticTask();

  return useMutation(
    orpc.task.schedule.mutationOptions({
      // Clearing the day clears the block server-side, so the optimistic state
      // has to do the same or the two disagree until the refetch lands.
      onMutate: ({ id, scheduledFor }) =>
        patch(
          id,
          scheduledFor === null
            ? { scheduledFor, plannedStartMin: null, plannedEndMin: null }
            : { scheduledFor },
        ),
      onError: (error, _variables, snapshot) => {
        restore(snapshot);
        toast.error(error.message);
      },
      onSettled: settle,
    }),
  );
}

export function useSetTaskPlannedTime() {
  const { patch, restore, settle } = useOptimisticTask();

  return useMutation(
    orpc.task.setPlannedTime.mutationOptions({
      onMutate: ({ id, plannedStartMin, plannedEndMin }) =>
        patch(id, { plannedStartMin, plannedEndMin }),
      onError: (error, _variables, snapshot) => {
        restore(snapshot);
        toast.error(error.message);
      },
      onSettled: settle,
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
