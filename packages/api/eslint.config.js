import { baseConfig } from "@lifedesk/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    // The server clock is the one place in this package allowed to construct
    // a Date. Everything else receives `now` through context.
    // See .claude/rules/dates-and-timezones.md.
    files: ["src/clock.ts", "**/*.test.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
