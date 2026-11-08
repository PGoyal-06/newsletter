# 0001. Two part stack: Apps Script mail worker plus a Next.js PWA with a server proxy

**Date**: 2026-11-07
**Status**: In Progress

## Summary

The app is built from two pieces in one repo. A Google Apps Script project (code that runs inside your own Google account) reads and labels your Gmail every 15 minutes and keeps today's newsletters ready as JSON. A Next.js web app on Vercel shows them on your iPhone home screen, works offline, and fetches the JSON through its own small server route, so the browser never talks to Google directly and no Google secret lives on the phone. Everything is TypeScript sharing one data contract package, so a mismatch between the two halves fails the build instead of failing at 7am.

## Decision

**Chosen option**: Option 1: Apps Script worker plus a Next.js PWA with a server proxy route, in a pnpm monorepo.

The backend is a Google Apps Script project written in TypeScript and bundled with esbuild; the frontend is a Next.js 16 App Router app on Vercel whose `/api/today` route proxies the Apps Script web app, with the app shell cached by a service worker and the snapshot persisted in IndexedDB by TanStack Query.

**Implementation skills**: `apps-script-clasp-workflow` (`bootgs/skills`, `.agents/skills/apps-script-clasp-workflow/`) · `apps-script-triggers` (`bootgs/skills`, `.agents/skills/apps-script-triggers/`) · `tanstack-query` (`tanstack-skills/tanstack-skills`, `.agents/skills/tanstack-query/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `tailwind-design-system` (`wshobson/agents`, `.agents/skills/tailwind-design-system/`) · `next-bundle-optimizer` (`vercel/next.js`, `.agents/skills/next-bundle-optimizer/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.agents/skills/playwright-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Architecture pattern | Two deployables in one repo: an Apps Script mail worker and a Next.js web app with one server route | The smallest shape that keeps Gmail auth managed by Google and still gives the phone a real app (basis: monolith first, extract nothing without a forcing reason) |
| Repo layout | pnpm workspace: `apps/script`, `apps/web`, `packages/contract` | The two halves speak one JSON shape; a shared package makes drift a compile error |
| Contract package | Source only: `exports` points at `src/index.ts`, no build step; esbuild inlines it into the worker, Next transpiles it via `transpilePackages`; no runtime dependency that needs Node or browser APIs | Nothing to rebuild when the contract changes, and it runs in both Apps Script and the browser |
| Package manager | pnpm (workspaces), version fixed by the root `packageManager` field (corepack) | Strict dependency isolation and first class workspaces; same pnpm everywhere |
| Versions | Exact versions pinned at scaffold (starting from the 2026-11-07 landscape note), `pnpm-lock.yaml` committed, installs run with `--frozen-lockfile`; Node pinned by `engines` and `.nvmrc` | A morning app should not change because a dependency did |
| Language | TypeScript, `strict: true`, in all three packages | One typed contract across the worker and the app (basis: shared types across a service boundary) |
| Runtime | Node 24 LTS locally and on Vercel; Apps Script V8 runtime for the worker | Current active LTS; clasp 3 needs Node 22 or newer |
| Mail worker | Google Apps Script, installable time driven trigger every 15 minutes, `doGet` web app (Execute as: me, Who has access: Anyone). "Anyone" is deliberate: `doGet` cannot read request headers, so the `key` query param is its only credential (at least 32 random bytes); a missing or wrong key gets the same generic error | Runs as the account owner with Google managed OAuth, so no OAuth client, no stored refresh tokens, no 7 day Testing expiry |
| Worker build | esbuild bundles `apps/script/src` into one `dist/Code.js`: `format: 'iife'`, `target: 'es2019'`, no minify (readable stack traces); a small entry file assigns every entry point to `globalThis` (`globalThis.doGet = …`, the trigger handler, `installTriggers`); a post build check fails the build if any expected global is missing; the build copies `appsscript.json` into `dist/`; `@types/google-apps-script` for types | clasp 3 no longer compiles TypeScript; Apps Script has no modules, and tree shaking would otherwise drop unreferenced entry points silently |
| Worker deploy | clasp 3.x with `rootDir: dist`; one manual command `pnpm --filter script deploy` that runs typecheck and tests first, then build, push, and `clasp deploy -i <deploymentId>` to update the existing deployment so the URL never changes; the deployment ID is committed in `apps/script/deploy.json` (not a secret) | Code lives in git; the Gmail scoped credential stays on your laptop only; the script half cannot ship untyped |
| Snapshot storage | One Drive file written by the worker (shape decided in spec 0002) | CacheService caps values at 100KB and Script Properties at 9KB, neither fits 1 to 2MB of HTML |
| Web framework | Next.js 16, App Router, standard output (not static export) | Needed for the server proxy route; static export forbids request reading route handlers |
| Proxy route | `app/api/today/route.ts`, Node runtime, dynamic, `Cache-Control: no-store`, `maxDuration = 30`; checks the app token, then calls Apps Script server side (`redirect: 'follow'`, aborted at 25 seconds) with the script key as a query param; forwards only a response whose content type is JSON and which parses, otherwise returns the typed error envelope (spec 0002) with a 502; never forwards Google's HTML pages; never logs the upstream URL (it contains the key) | Removes the Apps Script redirect CORS risk entirely, keeps the Google facing key off the phone, and turns Google's quota or login pages into an error the app understands |
| Auth | No user accounts. Phone sends `Authorization: Bearer <APP_TOKEN>`; the route hashes both values with SHA-256 and compares with `crypto.timingSafeEqual`; a mismatch returns a bare 401 with no detail. Both secrets are at least 32 random bytes | One user; two independent secrets so a leaked phone token cannot reach Apps Script directly; 256 bit tokens make rate limiting unnecessary at this scale |
| Data fetching | TanStack Query (current major) with a small custom `Persister` (`persistClient`, `restoreClient`, `removeClient`) that stores the dehydrated object directly in IndexedDB via `idb-keyval` (no `JSON.stringify`); persists only the `today` query (`shouldDehydrateQuery`); `maxAge` 24 hours; `buster` set to the contract version | Built in stale handling and background refetch; the stock persister stringifies 1 to 2MB on every write, which stalls an iPhone; the buster discards a cache whose shape no longer matches |
| Offline shell | Serwist (`@serwist/next` 9.x, `withSerwistInit` in `next.config`) with `--webpack` for **both** `next dev` and `next build`; Serwist disabled in development; precaches the app shell only, including `/`, which must stay statically rendered (no cookies or headers reads); `/api/*` is NetworkOnly; `skipWaiting` and `clientsClaim` on so a new shell takes over promptly | Mature PWA path the Next.js guide points to; one bundler in dev and prod; keeping data out of the service worker avoids two caches disagreeing |
| Device storage | The app token and the snapshot live in IndexedDB inside the installed home screen app; first launch calls `navigator.storage.persist()`; an empty store is a normal state (fetch and show loading) | iOS keeps Safari tab storage and home screen storage separate, so setup must happen inside the installed app; persistence lowers the eviction risk |
| PWA manifest | `app/manifest.ts` (Next built in), installed via Safari Share, Add to Home Screen | iOS has no install prompt; the built in manifest route is enough |
| Styling | Tailwind CSS v4 (CSS first config, tokens as CSS variables) | Tokens as variables make WCAG 2.2 AA contrast easy to centralize; component primitives are decided in the design system spec |
| HTML safety | DOMPurify 3.x in the browser, rendered into a sandboxed `iframe srcdoc` with `sandbox="allow-popups allow-popups-to-escape-sandbox"` (never `allow-scripts` or `allow-same-origin`); the exact policy (CSP meta inside `srcdoc`, link rewriting hook, image handling, iframe sizing) is decided in the reader spec | iOS Safari has no native Sanitizer API; DOMPurify is strongest on the real browser DOM, the sandbox is the second wall; the popup flags are what let newsletter links open |
| Hosting | Vercel Hobby, auto deploy from `main` via git. Project settings: Root Directory `apps/web`, include files outside the Root Directory, install from the workspace root with `--frozen-lockfile`, build command `pnpm -r typecheck && pnpm --filter web build`. Env vars set for Production and Preview; Preview deployments stay behind Vercel's deployment protection | $0 for personal use; Node functions for the proxy route; a contract mismatch actually blocks the deploy; previews never become a second public endpoint |
| Testing | Vitest (unit, one config per package), React Testing Library (components), Playwright on WebKit with an iPhone device profile (end to end, against `next start` with `/api/today` stubbed by a fixture, never live Apps Script), plus a manual check on the real phone each slice. Worker logic lives in pure functions that take Gmail, Drive, and Properties facades, so Vitest tests them with fakes; only the thin entry file touches Apps Script globals | Beta workflow needs a real suite; Apps Script globals cannot run locally; WebKit is close to iOS Safari but not identical to a home screen PWA |
| Observability | Apps Script execution log, Vercel function logs, and the in app stale banner (over 3 hours old) | One user; the stale banner is the alarm. Upgrade trigger: a second real user |
| Lint, format, CI | Decided by `/audit` (scope feature 2) from the scaffolded repo | Conventions come from the real project, not guesses |

### How a request flows

```
Gmail ──(trigger every 15 min)──▶ Apps Script worker ──writes──▶ Drive file (today.json)
                                         ▲
                                  doGet ?key=SCRIPT_KEY
                                         │ (server to server, follows Google's redirect)
iPhone PWA ──GET /api/today──▶ Next.js route on Vercel
  Authorization: Bearer APP_TOKEN        (checks token, no-store)
  ▲
  └─ TanStack Query: render from IndexedDB first, refetch in background
     Serwist service worker: app shell only, never /api/*
```

### Apps Script manifest and first time bootstrap

`apps/script/appsscript.json` (committed, copied into `dist/` by the build):
- `runtimeVersion: "V8"`
- `webapp`: `access: "ANYONE_ANONYMOUS"`, `executeAs: "USER_DEPLOYING"`
- `oauthScopes` pinned explicitly to the minimum: `https://www.googleapis.com/auth/gmail.modify` (read, label, archive; never delete) and `https://www.googleapis.com/auth/drive.file` (only the files the script itself creates)
- `timeZone`: your timezone, value fixed in spec 0002

One time setup, in order (the scaffold writes this as a checklist in `apps/script/README.md`):
1. `clasp login` on your laptop, then `clasp create` (standalone script) and commit `.clasp.json`.
2. First `pnpm --filter script deploy` pushes the code; create the web app deployment once in the editor, then commit its ID to `apps/script/deploy.json`.
3. Run `installTriggers()` once from the editor. This also triggers Google's consent screen for the two scopes. `installTriggers()` is idempotent: it deletes any trigger pointing at the handler before creating the 15 minute one.
4. Set `SCRIPT_KEY` in Script Properties, and `APP_TOKEN`, `SCRIPT_URL`, `SCRIPT_KEY` in Vercel.

### Boundaries other specs own

- `packages/contract`: the exact `today.json` shape, the error envelope, the category map, and the stored script settings, plus whether to add a runtime validation library at the proxy boundary: **spec 0002, data contract** (scope feature 3). Also owned there: atomic snapshot writes (the trigger must never leave a half written file that `doGet` reads; `doGet` returns the last good snapshot if the current one fails to parse), the timezone value and the date key the worker emits, and whether image or style stripping happens in the worker or on the phone.
- Worker run safety: a `LockService` script lock around each trigger run (skip if a run is still going), staying inside the 6 minute run limit and the daily trigger and Gmail quotas, and turning on Apps Script trigger failure emails: **core loop spec** (scope feature 5).
- How a 401 or an error envelope behaves in the query layer (no retry on 401, keep showing the cache, open setup to re-enter the token): **offline & freshness spec** (scope feature 7).
- Component primitives, tokens, and accessibility rules: **design system spec** (scope feature 4).
- The write endpoint for "set category in app" (scope feature 11) and where Web Push is sent from (scope feature 12): their own specs. This stack leaves room for both as additional route handlers.

## Configuration required

- `APP_TOKEN` (Vercel env, server only): random secret the phone sends as a bearer token; also entered once on the app's setup screen. Rotate by changing both.
- `SCRIPT_URL` (Vercel env, server only): the Apps Script web app `/exec` URL.
- `SCRIPT_KEY` (Vercel env, server only, and an Apps Script Script Property): the key the proxy sends to `doGet`. Rotate by changing both; no redeploy of the script.
- Apps Script Script Properties for the worker's own settings (last processed time, archiving switch): names fixed in spec 0002.
- `.clasp.json` (script ID, `rootDir: dist`) and `apps/script/deploy.json` (deployment ID) committed; `~/.clasprc.json` (your Google credential) never committed.
- `apps/web/src/env.ts` reads `APP_TOKEN`, `SCRIPT_URL`, `SCRIPT_KEY` on the server and throws at startup if any is missing; `apps/web/.env.example` lists them with no values; `.env.local` is gitignored.
- Generate both secrets with at least 32 random bytes (for example `openssl rand -base64 32`).

## Consequences

**Positive**:
- No OAuth client, no refresh token storage, no Google verification: the 7 day Testing expiry cannot break the morning job.
- CORS on Google's redirect no longer matters, because only the server talks to Apps Script.
- The phone holds one low power secret; the key that reaches your mailbox endpoint never leaves the server.
- A contract change that the worker and the app disagree on fails `tsc`, not your commute.
- $0 to run.

**Negative / tradeoffs**:
- Three moving parts to deploy (script, web app, env vars) and two secrets to keep in sync across Vercel and Script Properties.
- An extra network hop: first open each morning pays an Apps Script cold start plus a Vercel function cold start (unmeasured; plan for several seconds, with a hard cap of 25 seconds upstream), hidden by rendering from IndexedDB first.
- The Apps Script URL is public by design; the key is its only lock, so a leaked key exposes today's snapshot until you rotate it.
- Vercel function responses cap at about 4.5MB; the snapshot is 1 to 2MB today. If it grows past that, the snapshot needs splitting (list plus per issue fetch).
- `next build --webpack` gives up Turbopack's faster builds to keep Serwist on its mature path.
- The Apps Script bundle needs hand written global stubs for `doGet` and the trigger; forgetting one means a silently missing entry point.
- Playwright WebKit does not fully reproduce home screen PWA behavior (storage, standalone mode), so each slice still needs a manual phone check.
- Vercel Hobby is for personal, non commercial use; turning this into a paid product means moving to a paid plan.

**Neutral**:
- This revises the design doc in two places: the app is no longer a static export, and the phone stores an app token instead of the Apps Script URL and key. `docs/designs/morning-newsletter-feed.md` should note this.
- Installs only the runnable skeleton at scaffold; each later feature adds its own dependencies when built.

## Follow-up

- [ ] Connect the two MCP servers you picked (a config step only you can run): `claude mcp add next-devtools -- npx -y next-devtools-mcp@latest` and `claude mcp add clasp -- npx -y @google/clasp mcp` (clasp mcp is experimental and acts with your Gmail scoped login).
- [ ] Root `AGENTS.md` (written by `/audit`) should record under `## Agent skills`: `vitest`, `playwright-cli`, `playwright-best-practices` (project wide testing); `apps/web/AGENTS.md`: `tanstack-query`, `tailwind-4-docs`, `tailwind-design-system`, `next-bundle-optimizer`; `apps/script/AGENTS.md`: `apps-script-clasp-workflow`, `apps-script-triggers`. Root gets one line pointers to the nested files.
- [ ] Record for `AGENTS.md`: `MCP servers:` next-devtools-mcp, clasp mcp. `Declined:` Playwright MCP, `apps-script-services`, `clasp` (tnisizawa), `tailwindcss` (hairyf), `react-testing-library`, `pnpm-workspace`, `esbuild-bundler`, `next-dev-loop`, Next.js Cache Components and Partial Prefetching skills.
- [ ] No Agent Skill exists for Serwist or DOMPurify; follow their official docs during the scaffold and reader features.
- [ ] Slice 1's first task: prove the full thread on the real iPhone (Apps Script `doGet` reached from the Vercel route, following Google's redirect, JSON back to the home screen app).
- [ ] Scaffold gate (not optional): the scaffold is not done until a production build installed on the iPhone opens offline from the Serwist precache, and the worker's post build check passes.
- [ ] Update `docs/designs/morning-newsletter-feed.md` "First run" and output mode lines to match this spec (proxy route, app token on the phone).
