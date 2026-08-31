import { fileURLToPath } from "node:url";

import { config } from "dotenv";

/**
 * Load the repo-root `.env` into `process.env`.
 *
 * The monorepo keeps one `.env` at the root rather than a copy per package, so
 * the connection string is defined once. Nothing else finds it automatically:
 * Next reads `apps/web/.env`, and `dotenv/config` resolves against the cwd,
 * which differs for `next dev`, `vitest` and a `tsx` script.
 *
 * Anchored to this file's own location so all three agree, and called for side
 * effects at import time by `client.ts`.
 *
 * In production there is no `.env` — the variables come from the host — and a
 * missing file is a no-op, so this degrades correctly rather than throwing.
 * `override` is left off so a real environment variable always wins.
 */
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
