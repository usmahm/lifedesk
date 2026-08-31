import { baseConfig } from "@lifedesk/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  // Prisma writes this; it is not ours to lint.
  { ignores: ["src/generated/**"] },
  {
    // The seed builds fixed instants on purpose, and the client reads env.
    files: ["prisma/seed.ts", "src/client.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // A seed that reports what it wrote is doing its job; this is a CLI script,
    // not application code.
    files: ["prisma/seed.ts"],
    rules: { "no-console": "off" },
  },
];
