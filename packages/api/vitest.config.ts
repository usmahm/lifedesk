import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// The Prisma ownership suite needs DATABASE_URL to decide whether to run at
// all, and vitest does not read .env on its own. Anchored to this file rather
// than the cwd, which turbo and a direct `vitest` invocation disagree about.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The Prisma suite shares one database, so its cases cannot interleave.
    fileParallelism: false,
    // The default 5s is fine for in-memory maps and far too tight for a
    // remote Postgres: each case is several round trips to Neon, and a
    // suspended compute adds a cold start on top. Without this the suite
    // fails on a different test every run, which reads like flakiness rather
    // than the network cost it actually is.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
