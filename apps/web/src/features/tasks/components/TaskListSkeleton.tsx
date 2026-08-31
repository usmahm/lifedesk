import { Skeleton } from "@lifedesk/ui/components/skeleton";

/**
 * Matches TaskRow's real shape and height.
 *
 * A skeleton that doesn't match causes layout shift on load, which is worse
 * than a slightly longer wait. See .claude/rules/ui-components.md.
 */
export function TaskListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy aria-label="Loading tasks">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-12 items-center gap-3 px-2">
          <Skeleton className="size-4 rounded-[4px]" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5" style={{ width: `${45 + ((i * 17) % 35)}%` }} />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
