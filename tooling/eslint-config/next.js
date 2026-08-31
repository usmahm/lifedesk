import nextPlugin from "@next/eslint-plugin-next";

import { DATE_RESTRICTIONS } from "./base.js";
import { reactConfig } from "./react.js";

/**
 * Next.js app config.
 *
 * The `no-restricted-imports` block below is the machine-enforced half of the
 * security model in docs/PLAN.md §6.2: apps/web physically cannot reach the
 * data layer. A violation fails the build rather than being caught in review.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nextConfig = [
  ...reactConfig,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    rules: {
      // Spreads the date rules back in — flat config replaces a rule wholesale,
      // so omitting them here would quietly switch off the `new Date()` ban.
      "no-restricted-syntax": [
        "error",
        ...DATE_RESTRICTIONS,
        {
          // <If> cannot short-circuit: its children are evaluated as arguments
          // before it runs. A `!` inside therefore typechecks and then crashes
          // — the one hole the strict `boolean` prop can't close.
          selector: 'JSXElement[openingElement.name.name="If"] TSNonNullExpression',
          message:
            "A `!` assertion inside <If> is still evaluated — <If> does not short-circuit. Use `{value && …}` or a ternary so TypeScript narrows the value instead.",
        },
      ],

      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@lifedesk/db", "@lifedesk/db/*", "@prisma/*", "prisma", ".prisma/*"],
              message:
                "apps/web must never reach the database. Call an oRPC procedure instead. See .claude/rules/data-access.md.",
            },
            {
              group: ["@lifedesk/api/repos", "@lifedesk/api/repos/*", "@lifedesk/api/src/*"],
              message:
                "apps/web must not import repositories or api internals — only the router type and the oRPC client. See .claude/rules/data-access.md.",
            },
            {
              group: ["date-fns", "date-fns/*", "date-fns-tz", "date-fns-tz/*"],
              message:
                "Import named helpers from @lifedesk/core/time instead of a date library directly. See .claude/rules/dates-and-timezones.md.",
            },
          ],
        },
      ],
    },
  },
];
