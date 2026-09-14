"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useTags() {
  return useQuery(orpc.tag.list.queryOptions());
}

/**
 * Tag writes invalidate tasks too: a task carries `tagIds`, and renaming or
 * deleting a tag changes how every task holding it renders.
 */
function useTagInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: orpc.tag.key() });
    void queryClient.invalidateQueries({ queryKey: orpc.task.key() });
  };
}

export function useCreateTag() {
  const invalidate = useTagInvalidation();

  return useMutation(
    orpc.tag.create.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useUpdateTag() {
  const invalidate = useTagInvalidation();

  return useMutation(
    orpc.tag.update.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useDeleteTag() {
  const invalidate = useTagInvalidation();

  return useMutation(
    orpc.tag.remove.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}

export function useSetTaskTags() {
  const invalidate = useTagInvalidation();

  return useMutation(
    orpc.task.setTags.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );
}
