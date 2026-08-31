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
    /**
     * Android needs raster; these are what it installs to the home screen.
     *
     * Declared `any` rather than `maskable` on purpose. A maskable icon must
     * carry its own safe-zone padding, because Android crops it to whatever
     * shape the launcher uses — these already have a rounded square baked in,
     * so calling them maskable would crop the artwork twice and clip its
     * corners off.
     *
     * The tab icon and the iOS home-screen icon are not listed here:
     * `app/favicon.ico` and `app/apple-icon.png` are Next file conventions and
     * it emits the link tags for them itself.
     */
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
