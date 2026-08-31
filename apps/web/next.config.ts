import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript and are compiled by the app.
  transpilePackages: ["@lifedesk/ui", "@lifedesk/api", "@lifedesk/core", "@lifedesk/contracts"],

  // @lifedesk/db is deliberately absent, and must NOT be moved to
  // `serverExternalPackages` — an earlier note here said otherwise and was
  // wrong. Externalising tells Node to require the package at runtime, and it
  // exports raw TypeScript (`./src/index.ts`) that Node cannot load. It works
  // as-is because Turbopack follows the import chain through @lifedesk/api and
  // transpiles it transitively; the production build was run to confirm that
  // rather than assumed.

  typedRoutes: true,

  experimental: {
    // There is no Sentry, so a server stack trace in Vercel's logs is the
    // whole diagnostic story — it needs to name real files rather than bundled
    // offsets. Server-side only: browser source maps would ship the client
    // source to anyone who opens devtools, for no diagnostic gain here.
    serverSourceMaps: true,
  },
};

export default nextConfig;
