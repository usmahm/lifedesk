import { baseConfig } from "@lifedesk/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    // src/time is the single place in the repo allowed to construct a Date.
    // Everywhere else imports named helpers from here instead.
    // See .claude/rules/dates-and-timezones.md.
    files: ["src/time/**/*.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // Tests construct fixed instants on purpose — that is the whole point of
    // injecting `now` rather than reading a clock.
    files: ["**/*.test.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
