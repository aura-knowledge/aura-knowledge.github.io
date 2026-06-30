/**
 * Generate a service worker with Workbox precaching.
 *
 * Runs as the LAST step in the build pipeline (after astro build and
 * postprocess-reader-copy) so the precache manifest reflects the final
 * dist content.
 */
import { generateSW } from "workbox-build";

const result = await generateSW({
  swDest: "dist/sw.js",
  globDirectory: "dist/",
  globPatterns: ["**/*.{html,css,js,json,md,svg,webp,txt,jsonl,png,webmanifest}"],
  globIgnores: ["sw.js", "workbox-*.js"],
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  directoryIndex: "index.html",
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
});

console.log(`[generate-sw] Precached ${result.count} files (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
