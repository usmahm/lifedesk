import type { ReactNode } from "react";

/**
 * Renders its children when `condition` is true.
 *
 * `condition` is strictly `boolean` — never a truthy value — and that is
 * load-bearing rather than fussiness. Two things are true of any wrapper
 * component in React:
 *
 *   1. Children are evaluated as *arguments*, before this component runs. It
 *      cannot short-circuit them the way `&&` does.
 *   2. TypeScript cannot narrow a type across a component boundary.
 *
 * Requiring a boolean turns both into compile errors instead of runtime ones:
 *
 *     <If condition={area}>            ✗ 'Area | undefined' is not 'boolean'
 *     <If condition={Boolean(area)}>   ✓ — but `area.color` inside still errors
 *
 * So when the condition is doing narrowing work, keep `{value && …}` or a
 * ternary. You don't have to remember which case you're in; the compiler says.
 *
 * The one hole a boolean can't close is a `!` assertion inside, which
 * typechecks and then crashes — an ESLint rule in tooling/eslint-config/next.js
 * catches that.
 */
export function If({ condition, children }: { condition: boolean; children: ReactNode }) {
  return condition ? <>{children}</> : null;
}
