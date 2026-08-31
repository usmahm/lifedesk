import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Anchored to this file rather than the cwd. Bare `dotenv/config` resolves
// against wherever the command was run from, so it silently finds nothing when
// the CLI runs inside packages/db while `.env` lives at the repo root.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

/**
 * Prisma 7 moved connection URLs out of `schema.prisma` entirely, and stopped
 * loading `.env` on its own — hence the import above.
 *
 * The split is now explicit, which it never was under `directUrl`:
 *
 *   DIRECT_URL    unpooled → migrations, here. Neon's pooler cannot run DDL.
 *   DATABASE_URL  pooled   → the running app, via the adapter in src/client.ts.
 *
 * Both live in the repo-root `.env`; see `.env.example`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
