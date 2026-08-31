"use client";

import { AreaDot } from "@lifedesk/ui/components/domain/area-dot";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { cn } from "@lifedesk/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { orpc } from "@/lib/orpc/client";

export function AreaNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const areas = useQuery(orpc.area.list.queryOptions({ input: { includeArchived: false } }));

  if (areas.isPending) {
    return (
      <div className="flex flex-col gap-2 px-2.5 py-1.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
    );
  }

  // The rail stays quiet when something goes wrong — the page body carries
  // the error, and a broken sidebar shouldn't shout over it.
  if (areas.isError || areas.data.length === 0) return null;

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Areas">
      {areas.data.map((area) => {
        const href = `/areas/${area.id}`;
        const isActive = pathname === href;

        return (
          <Link
            key={area.id}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <AreaDot color={area.color} />
            <span className="truncate">{area.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
