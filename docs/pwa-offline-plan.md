# PWA / Offline Access Plan for Aura Knowledge (Revised)

## Goal
Make the entire Aura Knowledge site (89 HTML pages, ~7.6 MB) fully accessible offline on iOS Safari ("Add to Home Screen") and any modern browser, with zero native code.

## Current State
- **Stack**: Astro static site, `output: "static"`, deployed to GitHub Pages root (`https://aura-knowledge.github.io`)
- **Build pipeline**: `generate && astro build && postprocess:reader-copy` → `dist/`
- **Output**: 89 HTML pages, 3.5 MB `_astro/` JS/CSS chunks (content-hashed), 1.7 MB `agents/` JSON+MD, graph data, scripts
- **Layout**: Single `BaseLayout.astro` wraps all pages
- **Icons**: Only `favicon.svg` exists. No PNG icons, no manifest, no service worker
- **No `base` path** — root deploy, SW scope is `/`

## Approach: `workbox-build` post-build script

**Why not `@vite-pwa/astro`**: Sibling review found two blockers:
1. The integration does NOT auto-inject manifest link or SW registration into Astro pages — requires manual `virtual:pwa-*` module wiring in BaseLayout.
2. Documented Vite 7.3.x compatibility issues with `vite-plugin-pwa` manifest generation.

**Why `workbox-build` in a post-build script**:
- Runs AFTER `postprocess-reader-copy` → precache manifest reflects final dist content (fixes stale revision bug)
- No Vite version coupling — `workbox-build` operates on the filesystem, independent of the build tool
- Simpler: one Node script, no integration, no virtual modules, no TypeScript config changes
- `generateSW` mode creates a complete, production-ready service worker with Workbox runtime + precache manifest

## Implementation Steps

### Step 1: Generate PWA Icons

Use `rsvg-convert` (available on this machine) to generate PNGs from `favicon.svg`:

- `public/icons/icon-192.png` — standard PWA icon
- `public/icons/icon-512.png` — standard PWA icon
- `public/icons/apple-touch-icon-180.png` — iOS home-screen icon (Apple recommends 180×180)

For the **maskable** icon, create a separate `maskable.svg` source with an expanded viewBox (`0 0 80 80`) so the existing 64×64 artwork sits centered within the maskable safe zone (inner 80%). Then rasterize to `public/icons/maskable-512.png`.

### Step 2: Install `workbox-build`
```
npm install -D workbox-build
```

### Step 3: Create `public/manifest.webmanifest`

A static manifest file served from the root:
```json
{
  "id": "/",
  "name": "Aura Knowledge",
  "short_name": "Aura",
  "description": "A focused knowledge garden for human essays and agent-readable research artifacts.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#0d1117",
  "background_color": "#0d1117",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Step 4: Create `scripts/generate-sw.mjs`

Uses `workbox-build.generateSW` to produce `dist/sw.js` + Workbox runtime from the FINAL dist content (after postprocessing):

```js
import { generateSW } from "workbox-build";

await generateSW({
  swDest: "dist/sw.js",
  globDirectory: "dist/",
  globPatterns: ["**/*.{html,css,js,json,md,svg,webp,txt,jsonl}"],
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  navigateFallback: null,        // precache + directoryIndex handles routing
  directoryIndex: "index.html",  // resolves /articles/ → /articles/index.html
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,             // autoUpdate behavior
});
```

### Step 5: Update build pipeline in `package.json`

```json
"build": "npm run generate && astro build && npm run postprocess:reader-copy && npm run generate-sw",
"generate-sw": "node scripts/generate-sw.mjs"
```

### Step 6: Add manifest link, SW registration, apple meta tags to `BaseLayout.astro`

In `<head>`:
```html
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Aura" />
```

SW registration (inline script, no dependencies):
```js
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
```

### Step 7: Build, verify, and test offline
- Verify `dist/sw.js`, `dist/workbox-*.js`, `dist/manifest.webmanifest` exist
- Check build log for Workbox file-size warnings
- `astro preview` → DevTools → Application → confirm SW registered + precache populated
- Network → Offline → reload → verify full site navigation
- **Specifically test**: an article with mermaid diagrams, a trailing-slash URL, the graph page

## Risk Assessment

### Solved by this approach
- ✅ No Vite version coupling (workbox-build runs on filesystem, not in Vite pipeline)
- ✅ Precache manifest reflects post-processed HTML (generate-sw runs last)
- ✅ SW registration is explicit and simple (inline script, no virtual modules)
- ✅ iOS support complete (apple-touch-icon, apple meta tags, manifest)

### Remaining risks (low)
- **iOS SW update lag**: iOS Safari checks for SW updates on cold launch, may hold stale `/sw.js` up to 24h. Acceptable for infrequently-updated knowledge site.
- **Large JS chunks**: If any single file exceeds 6MB, Workbox silently excludes it. Will verify largest files before finalizing threshold.

## Files Changed
1. `astro.config.mjs` — **unchanged**
2. `public/icons/icon-192.png` — new (generated)
3. `public/icons/icon-512.png` — new (generated)
4. `public/icons/apple-touch-icon-180.png` — new (generated)
5. `public/icons/maskable-512.png` — new (generated)
6. `public/maskable.svg` — new (maskable icon source)
7. `public/manifest.webmanifest` — new
8. `scripts/generate-sw.mjs` — new
9. `src/layouts/BaseLayout.astro` — add manifest link, apple meta tags, SW registration
10. `package.json` — add `workbox-build` devDep, `generate-sw` script, update `build`
11. `package-lock.json` — updated lockfile

## What is NOT included (deliberately)
- No offline Q&A / voice features (separate project, pending real demand)
- No push notifications
- No native shell (Capacitor/Tauri)
- No changes to content, article structure, or existing components
