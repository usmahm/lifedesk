import { nextConfig } from "@lifedesk/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextConfig,
  {
    // The browser clock is the one place in the app allowed to read local
    // time. Everything else receives `now` as an argument.
    // See .claude/rules/dates-and-timezones.md.
    files: ["src/lib/clock.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
];
