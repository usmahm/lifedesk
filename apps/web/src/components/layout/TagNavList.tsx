"use client";

import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { AREA_COLOR_VAR } from "@lifedesk/ui/lib/area-colors";
import { cn } from "@lifedesk/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTags } from "@/features/tags/hooks/useTagMutations";

/**
 * Tags in the rail, under Areas.
 *
 * Renders nothing at all until there is at least one tag — a "Tags" heading
 * over empty space is a permanent reminder of a feature you aren't using, and
 * tags are created from inside a task rather than here.
 */
export function TagNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const tags = useTags();

  if (tags.isPending) {
    return (
      <div className="flex flex-col gap-2 px-2.5 py-1.5">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
    );
  }

  if (tags.isError || tags.data.length === 0) return null;

  return (
    <>
      <p className="px-2.5 pt-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Tags
      </p>

      <nav className="flex flex-col gap-0.5" aria-label="Tags">
        {tags.data.map((tag) => {
          const href = `/tags/${tag.id}`;
          const isActive = pathname === href;

          return (
            <Link
              key={tag.id}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className="inline-block size-1.5 shrink-0 rounded-full"
                style={{ background: AREA_COLOR_VAR[tag.color] }}
              />
              <span className="truncate">{tag.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
