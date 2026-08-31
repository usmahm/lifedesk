import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript and are compiled by the app.
  transpilePackages: ["@lifedesk/ui", "@lifedesk/api", "@lifedesk/core", "@lifedesk/contracts"],

  // Phase 2 note: when @lifedesk/db arrives it goes in `serverExternalPackages`,
  // not here — the generated Prisma client must never be bundled by Turbopack.
  // See docs/PLAN.md §6.1.

  typedRoutes: true,
};

export default nextConfig;
