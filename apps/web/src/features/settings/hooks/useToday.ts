"use client";

import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

/**
 * Today, the week start, and the user's timezone — resolved on the server.
 *
 * The client must never compute this from its own clock: the browser's zone is
 * not necessarily the user's, and a mismatch puts tasks on the wrong day.
 * See .claude/rules/dates-and-timezones.md.
 */
export function useToday() {
  return useQuery(orpc.settings.today.queryOptions());
}
