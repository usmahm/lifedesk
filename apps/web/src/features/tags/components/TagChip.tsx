import type { AreaColor } from "@lifedesk/contracts";
import { AREA_COLOR_VAR } from "@lifedesk/ui/lib/area-colors";
import { cn } from "@lifedesk/ui/lib/utils";

/**
 * A tag, shown as an outlined chip rather than a filled one.
 *
 * Area colour is never a fill outside the time grid — eight filled chips in a
 * row is the fruit salad the design rules exist to prevent. The colour lives
 * in the border and the dot, which is enough to tell them apart.
 */
export function TagChip({
  name,
  color,
  className,
}: {
  name: string;
  color: AreaColor;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
      style={{ borderColor: AREA_COLOR_VAR[color] }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: AREA_COLOR_VAR[color] }}
      />
      {name}
    </span>
  );
}
