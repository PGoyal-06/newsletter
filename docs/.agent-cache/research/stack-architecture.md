# Stack research: Next.js, PWA, Apps Script, DOMPurify, Tailwind

Researched 2026-11-07. Fetch budget: 8 pages; search budget: 3 of 5 used.
"Fetched" = read via WebFetch. "Search-only" = seen in search results, not fetched. "Unverified" = no source read.

## 1. Next.js

- **Current stable major:** Next.js 16. npm `latest` tag is **16.4.5**.
  - Source fetched: https://registry.npmjs.org/next/latest
  - Freshness: registry is live, so this is current as of the fetch.
- **Static export (`output: 'export'`):** supported. Enabled in `next.config`, then `next build` writes `out/`.
  - Supported: Server Components (run at build time), Client Components, `next/image` with a custom loader, GET Route Handlers that use `export const dynamic = 'force-static'`.
  - Not supported: Dynamic routes without `generateStaticParams()`, route handlers that read the Request, cookies, rewrites, redirects, headers, proxy/middleware, ISR, default image optimization, draft mode, Server Actions, intercepting routes.
  - Hosting: any static file host. Vercel deploys the output too, but the features above stay unavailable.
  - Source fetched: https://nextjs.org/docs/app/guides/static-exports (page says lastUpdated 2026-08-09).
- **Implication for this project:** the Apps Script `doGet` call is a plain browser `fetch()` from the client, so a static export works. Anything needing a server-side secret, a Server Action, or a middleware would not.

## 2. PWA / service worker

- **Next.js official PWA guide:** exists. Fetched: https://nextjs.org/docs/app/guides/progressive-web-apps (lastUpdated 2026-07-30).
  - Manifest: create `app/manifest.ts` (or `.json`). Returns name, icons, `display: 'standalone'`, etc.
  - Install: iOS has no install prompt API, so the guide says to tell the user to use Share, then Add to Home Screen. `beforeinstallprompt` does not work on iOS Safari.
  - Offline caching: the guide does not build it in. It points to **Serwist** for service-worker caching, with examples for both Turbopack and webpack.
  - Push: supported on iOS 16.4+ for home-screen-installed apps.
  - Local HTTPS: `next dev --experimental-https` is needed for testing push.
- **Serwist (`@serwist/next`):** maintained. Latest **9.5.13** per npm (fetched: https://registry.npmjs.org/@serwist/next/latest). No deprecation flag. Peer dependency: `next >=14.0.0`.
  - Official Turbopack setup exists: `@serwist/turbopack`, `esbuild-wasm`, `serwist`, with a `createSerwistRoute` helper (search-only: https://serwist.pages.dev/docs/next/turbo).
  - Dev-mode caveat: third-party template and skill pages say Serwist is disabled or warns under `next dev --turbo` (search-only, not confirmed against Serwist docs). Production builds with Turbopack are claimed to work, but that is unverified.
  - Pick one: webpack path (`@serwist/next`) or Turbopack path (`@serwist/turbopack`). Check the Serwist docs for which one matches the Next version you install.
- **next-pwa:** no fetched evidence in this session. Unverified whether it is deprecated. Serwist is the path the official Next.js guide names.
- **Simplest option for this app:** a manifest plus a hand-written service worker is possible, but Serwist saves writing the caching logic. Caching a JSON API needs an explicit runtime strategy either way.

## 3. Apps Script local dev / clasp

- **clasp version:** npm `latest` is **3.4.1** (fetched: https://registry.npmjs.org/@google/clasp/latest). No deprecation flag.
- **TypeScript:** clasp 3 does **not** transpile TypeScript. The README says "Clasp no longer transpiles typescript code." Fetched: https://github.com/google/clasp
  - Recommended: bundle or compile with a tool (README names Rollup, plus templates). Then `clasp push` the built output.
  - `.clasp.json` has a `rootDir` setting. Sample uses `"rootDir": "build/"`.
  - Node.js 22.0.0 or later is required (from the same README).
- **Typical setup (not fetched, standard practice):** `@types/google-apps-script` for types, esbuild or Rollup to bundle into one file, output to `build/`, `clasp push` from there. Verify exact package names before installing.

## 4. DOMPurify and the Sanitizer API

- **DOMPurify:** npm `latest` is **3.4.17** (fetched: https://registry.npmjs.org/dompurify/latest). No deprecation flag.
  - Recommended in general for sanitizing untrusted HTML in the browser. This recommendation is from general knowledge and was not re-fetched this session (unverified as "current guidance").
  - For email HTML: DOMPurify is a reasonable default. Email HTML often needs style and table allowances, so check the config options before use.
- **Sanitizer API (`setHTML()`):** not shipped in Safari, per the sources I found.
  - Search-only evidence: https://web-platform-dx.github.io/web-features-explorer/features/sanitizer/ marks Safari and Safari on iOS as not supported.
  - Firefox: search-only sources say `setHTML` shipped in Firefox 148 (2026-02-24). Chrome status conflicts across sources.
  - Freshness: the sources are early 2026. Current Safari status **unverified** for November 2026. Check WebKit release notes or MDN before relying on it.
  - Safari 17.4 has `setHTMLUnsafe()`, which does NOT sanitize. Do not confuse it with `setHTML()`.
  - Practical answer: use DOMPurify now, with feature detection for the native API if you want it later.

## 5. Tailwind CSS

- **Current major:** Tailwind v4. npm `latest` is **4.3.5** (fetched: https://registry.npmjs.org/tailwindcss/latest). No deprecation flag.
- **Next.js compatibility:** not verified in this session. Tailwind v4 is the current major and is the default in recent Next.js starters (unverified from memory, not fetched). Check the Tailwind v4 Next.js install guide before installing.

## 6. Apps Script fetch from the browser (CORS)

- **Redirect:** the `/exec` URL on script.google.com returns a 302 to a one-time URL on script.googleusercontent.com. This is by design, per Google's Content Service docs (search-only: https://developers.google.com/apps-script/content_service).
- **CORS:** community reports say browser `fetch()` to the redirect target can fail with a missing `Access-Control-Allow-Origin` header. Some reports say it works in desktop browsers and fails on mobile Chrome. Official Google statement not found. Fixes reported are anecdotal (search-only: https://mail-archive.com/google-visualization-api@googlegroups.com/msg39184.html and https://redlib.hbubli.cc/r/GoogleAppsScript/comments/1k1yqfm/google_apps_script_web_app_post_request_works_on).
- **Simple GET:** plain GET with no custom headers is a "simple request" and avoids a preflight. The problem is the response header on the redirect target, not the preflight.
- **Gotchas found:**
  - Duplicate `doGet` definitions across files: the last one wins.
  - Deploy as a new version after changes. The `/exec` URL serves the deployed version, not the latest save.
  - Access must be "Anyone" (or "Anyone with the link") for a browser to call it without auth.
  - JSONP is the old workaround; the Content Service docs describe it for browser use.
- **Test first:** open the `/exec` URL directly in the browser, then run `fetch()` from the deployed PWA on iPhone Safari, since that is the target.
- **Unverified:** whether iOS Safari behaves differently from desktop for this redirect. Test on the device.

## Sources actually fetched

- https://registry.npmjs.org/next/latest
- https://nextjs.org/docs/app/guides/static-exports
- https://nextjs.org/docs/app/guides/progressive-web-apps
- https://registry.npmjs.org/@serwist/next/latest
- https://registry.npmjs.org/@google/clasp/latest
- https://github.com/google/clasp
- https://registry.npmjs.org/dompurify/latest
- https://registry.npmjs.org/tailwindcss/latest

## Search-only sources (not fetched)

- https://serwist.pages.dev/docs/next/turbo
- https://web-platform-dx.github.io/web-features-explorer/features/sanitizer/
- https://developers.google.com/apps-script/content_service
- https://mail-archive.com/google-visualization-api@googlegroups.com/msg39184.html
- https://redlib.hbubli.cc/r/GoogleAppsScript/comments/1k1yqfm/google_apps_script_web_app_post_request_works_on
