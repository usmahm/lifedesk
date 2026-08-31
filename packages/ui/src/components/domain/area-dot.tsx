import type { AreaColor } from "@lifedesk/contracts";

import { AREA_COLOR_VAR } from "@lifedesk/ui/lib/area-colors";
import { cn } from "@lifedesk/ui/lib/utils";

/**
 * An area's identity in a list.
 *
 * A 6px dot, or a 3px left edge — never a filled background. Filled colour
 * backgrounds turn any list of eight items into a fruit salad, and they are
 * the fastest way to lose the calm. See .claude/rules/design-tokens.md.
 */

export function AreaDot({
  color,
  label,
  className,
}: {
  color: AreaColor;
  /** The area's name, for screen readers — colour is never the only signal. */
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-1.5 shrink-0 rounded-full", className)}
      style={{ background: AREA_COLOR_VAR[color] }}
      role={label ? "img" : "presentation"}
      aria-label={label}
    />
  );
}

export function AreaEdge({ color, className }: { color: AreaColor; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute inset-y-1 left-0 w-[3px] rounded-full", className)}
      style={{ background: AREA_COLOR_VAR[color] }}
    />
  );
}
