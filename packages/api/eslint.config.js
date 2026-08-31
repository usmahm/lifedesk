import { baseConfig } from "@lifedesk/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    // The server clock is the one place in this package allowed to construct
    // a Date. Everything else receives `now` through context.
    // See .claude/rules/dates-and-timezones.md.
    // `-suite.ts` is test code too — it just isn't collected as a file, so it
    // can be run once per repository implementation.
    files: ["src/clock.ts", "**/*.test.ts", "**/*-suite.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
