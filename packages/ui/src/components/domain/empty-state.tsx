import type { ReactNode } from "react";

import { cn } from "@lifedesk/ui/lib/utils";

/**
 * Empty is a designed state, not a blank.
 *
 * One line of copy, exactly one action, no illustration. Copy should be
 * specific and calm — "Nothing scheduled for today", never "No items found".
 * A blank Inbox should read as earned, not broken.
 */
export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 px-1 py-10", className)}>
      <p className="text-muted-foreground text-sm">{title}</p>
      {action}
    </div>
  );
}
