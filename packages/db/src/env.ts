import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";

import { config } from "dotenv";

/**
 * Load the repo-root `.env` into `process.env`.
 *
 * The monorepo keeps one `.env` at the root rather than a copy per package, so
 * the connection string is defined once. Nothing finds it automatically: Next
 * reads `apps/web/.env`, and `dotenv/config` resolves against the cwd, which
 * differs between `next dev`, `vitest` and a `tsx` script.
 *
 * Located by walking up from the cwd to the directory holding
 * `pnpm-workspace.yaml`. The obvious alternative — `new URL("../../../.env",
 * import.meta.url)` — looks tidier and breaks under Turbopack, which rewrites
 * that pattern into an asset reference and yields a URL from another realm
 * that `fileURLToPath` rejects. Walking the tree is dull and works everywhere.
 *
 * In production there is no `.env` — the variables come from the host — and a
 * missing file is a no-op, so this degrades correctly rather than throwing.
 * `override` is left off, so a real environment variable always wins.
 */
function findWorkspaceRoot(from: string): string | null {
  const { root } = parse(from);

  for (let dir = from; dir !== root; dir = dirname(dir)) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
  }
  return null;
}

const workspaceRoot = findWorkspaceRoot(process.cwd());

if (workspaceRoot) {
  config({ path: join(workspaceRoot, ".env"), quiet: true });
}
