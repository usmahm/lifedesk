"use client";

import type { CalendarDay } from "@lifedesk/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useDayPlan(day: CalendarDay | undefined) {
  return useQuery({
    ...orpc.dayPlan.get.queryOptions({ input: { day: day as CalendarDay } }),
    enabled: Boolean(day),
  });
}

export function useSetIntention() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.dayPlan.setIntention.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.dayPlan.key() }),
      onError: (error) => toast.error(error.message),
    }),
  );
}
