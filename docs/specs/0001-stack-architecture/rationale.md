# 0001. Stack and architecture: rationale

Decision record for [index.md](index.md). `/develop` reads `index.md`; this file holds the why.

## Context

You want a personal newsletter reader on your iPhone that pulls newsletters out of a Gmail inbox you avoid (17,000+ unread) and shows only today's issues, ready to open on the morning commute. The approved design (`docs/designs/morning-newsletter-feed.md`) and the scope (`docs/scope/scope.md`) fix the product: one user, $0 a month, buildable in one or two weekends by an intern who knows Next.js, React Native, and Expo, with a Tracer Bullet build approach and a Beta workflow (verify then test), GA for the risky features.

The forces are mostly about Google and iOS, not scale. Gmail API access through your own OAuth client in Testing mode issues refresh tokens that expire after 7 days, which would kill an unattended morning job silently; a personal app whose only user is the developer is exempt from verification, but you would still store and refresh tokens on a server. Gmail read and modify scopes are restricted scopes. Apps Script installable triggers run as the account owner with Google managing the OAuth client.

On the phone, an iOS home screen PWA cannot fetch in the background before you open it, has no install prompt, and has no native Sanitizer API, while the content it renders is untrusted email HTML. The Apps Script web app URL redirects to a different Google domain, and reports are mixed on whether that redirect target allows browser reads (CORS). The snapshot is 1 to 2MB of HTML a day, and the commute may have patchy signal.

Not deciding now means `/develop` would pick the repo layout, the worker language, the caching split, and the security boundary while scaffolding, and those are the expensive things to change later.

## Options considered

### Option 1: Apps Script worker plus a Next.js PWA with a server proxy, pnpm monorepo

The worker is TypeScript bundled with esbuild and pushed with clasp. The web app runs Next.js in standard mode on Vercel with one route handler that proxies Apps Script server side. TanStack Query persists the snapshot in IndexedDB, Serwist caches only the app shell, and DOMPurify plus a sandboxed iframe render the issues. Shared types live in `packages/contract`.

**Pros**:
- Google manages Gmail auth; no tokens to store or refresh (basis: avoid storing credentials you do not need).
- CORS on Google's redirect is irrelevant because only the server calls Apps Script.
- The Google facing key never reaches the phone; the phone's token can only read today's snapshot.
- One typed contract across both halves.

**Cons**:
- Three things to deploy and two secrets to sync.
- An extra hop and two cold starts on the first morning fetch.
- More setup than a static site.

### Option 2: Apps Script worker plus a static export PWA calling Apps Script directly (the design doc's original plan)

Same worker, but the web app is plain static files and the phone fetches the Apps Script URL itself with the key in the query string.

**Pros**:
- Fewest moving parts: no server code at all, fastest CDN delivery.
- One secret instead of two.

**Cons**:
- Depends on Google's redirect target allowing browser reads, which is unverified for iOS Safari; failure means switching modes later.
- The key that reaches your mailbox endpoint sits on the phone and in every request URL.

### Option 3: Apps Script only, UI served by HtmlService

One Apps Script project serves both the mail logic and the pages.

**Pros**:
- One codebase, nothing else to deploy, zero auth work.

**Cons**:
- Pages load in 2 to 4 seconds inside a Google banner and iframe, with no offline support, which recreates the friction the product exists to remove (rejected in office hours).

### Option 4: Gmail API worker on a serverless cron plus a Next.js PWA

Your own Google OAuth client published unverified under the personal use exemption, a scheduled function on Vercel or Cloudflare that pulls Gmail, and the same web app.

**Pros**:
- Standard web stack end to end; the same architecture a multi user product would need.

**Cons**:
- You store and refresh Gmail tokens on a server; a revoked or expired token fails silently at 5am unless you add alerting.
- More code and more security surface for a user count of one.

## Rationale

The deciding force is unattended reliability against Google auth. Option 4 and any own OAuth client put token storage and refresh on you; Apps Script makes Google own it, which removes the failure you were most worried about in office hours. That rules the backend to Apps Script (Options 1 to 3).

Among those, Option 3 fails the product premise (calm, instant, offline), so the real choice is how the phone reaches Apps Script. You preferred the proxy (Option 1) over the static site (Option 2). I would have started static and proved CORS first, since it is one less moving part, but your pick is the sturdier one for two concrete reasons from the context: the CORS behavior of Google's redirect is unverified on iOS Safari, and the proxy keeps the mailbox facing key server side. The cost you are consciously accepting is an extra hop and a second secret, both small at one user (basis: design for failure, keep secrets where the attacker is not).

The remaining layers follow from the same forces. TypeScript plus a shared contract package turns cross boundary drift into a build error (basis: shared types across a service boundary). TanStack Query owns the snapshot cache and the service worker owns only the shell, so there is exactly one source of truth for data (basis: single source of truth for cached state). DOMPurify on the real browser DOM plus a script free sandbox gives two independent walls around untrusted HTML (basis: defense in depth for untrusted content). Serwist runs on the webpack build because its Turbopack path is newer, and a PWA you rely on every morning should use the mature path (basis: boring technology for things you depend on daily). Manual script deploys keep a Gmail scoped credential out of CI (basis: least privilege for credentials).

## References

**Project sources** (verifiable, in this repo):
- `docs/designs/morning-newsletter-feed.md` (approved office hours design, approach B)
- `docs/scope/scope.md` (feature 1, Tracer Bullet, Beta workflow)
- Installed skills listed in `index.md` under Implementation skills
- `docs/.agent-cache/research/stack-architecture.md` and `docs/.agent-cache/tool-discovery/stack-architecture.md` (landscape and discovery notes, 2026-11-07)

**Practices & standards**:
- Monolith first, extract nothing without a forcing reason
- Shared types across a service boundary
- Single source of truth for cached state
- Defense in depth for untrusted content
- Least privilege for credentials
- Boring technology for things you depend on daily

**Links** (web verified during this design session):
- Next.js static exports guide: https://nextjs.org/docs/app/guides/static-exports
- Next.js progressive web apps guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- Next.js latest release (registry): https://registry.npmjs.org/next/latest
- Serwist for Next.js (registry): https://registry.npmjs.org/@serwist/next/latest
- clasp (Google): https://github.com/google/clasp
- DOMPurify (registry): https://registry.npmjs.org/dompurify/latest
- Tailwind CSS (registry): https://registry.npmjs.org/tailwindcss/latest
- Google OAuth refresh token expiration: https://developers.google.com/identity/protocols/oauth2#expiration
- Restricted scope verification and exceptions: https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- Gmail API scopes: https://developers.google.com/workspace/gmail/api/auth/scopes
- Apps Script installable triggers: https://developers.google.com/apps-script/guides/triggers/installable
- Next.js DevTools MCP: https://github.com/vercel/next-devtools-mcp
- Playwright MCP: https://github.com/microsoft/playwright-mcp

## Landscape evidence (2026-11-07)

- Next.js 16 is current stable (16.4.5). Static export forbids route handlers that read the request, middleware, rewrites, headers, and Server Actions.
- The Next.js PWA guide uses `app/manifest.ts` and points to Serwist for offline; iOS needs Share, Add to Home Screen.
- `@serwist/next` 9.5.13, maintained, peer `next >= 14`. A separate `@serwist/turbopack` exists; dev mode issues reported under Turbopack.
- clasp 3.4.1 no longer transpiles TypeScript; bundle first, then push a build directory via `rootDir`.
- DOMPurify 3.4.17 is current. The browser Sanitizer API is not supported in Safari or iOS.
- Tailwind CSS 4.3.5 is current.
- Apps Script `/exec` redirects to `script.googleusercontent.com`; community reports of missing CORS headers on the redirect target are mixed and unofficial.
