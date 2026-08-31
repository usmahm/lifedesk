import type { MetadataRoute } from "next";

/**
 * PWA manifest — installable to the home screen from day one.
 *
 * Offline support is Phase 4; this is the install surface only.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeDesk",
    short_name: "LifeDesk",
    description: "Plan your month, week, and day — and see where the hours actually went.",
    start_url: "/today",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fcfbf9",
    theme_color: "#fcfbf9",
    // SVG only for now. Raster fallbacks (192/512 PNG) are worth adding
    // before anyone installs this on Android, which prefers PNG.
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
