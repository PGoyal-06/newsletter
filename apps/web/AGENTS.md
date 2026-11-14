# Web app (apps/web)

## Overview

Next.js 16 App Router PWA installed to the iPhone home screen. Opens offline from a Serwist precached shell; data will come through a server proxy route (`/api/today`) that calls the Apps Script worker, so no Google secret reaches the phone.

## Key files

| File | Owns |
|---|---|
| `next.config.ts` | Serwist setup (precaches `/`), `transpilePackages` for the contract |
| `src/app/sw.ts` | Service worker: app shell precache, `/api/*` NetworkOnly |
| `src/app/manifest.ts` | PWA manifest (standalone, start at `/`) |
| `src/app/page.tsx` | The shell; must stay statically rendered |
| `src/app/globals.css` | Design tokens from `DESIGN.md` (Tailwind v4 `@theme`), iOS Dynamic Type root, focus ring |
| `src/app/layout.tsx` | Self hosted fonts (`next/font/google`) exposed as CSS variables |
| `src/env.ts` | The only `process.env` reader (server only); validated at build by `next.config.ts` (a bad or missing secret fails the build and the Vercel deploy) and at start by `src/instrumentation.ts` |
| `src/features/design-system/ui/index.ts` | Public entry for the base components (`IssueRow`, `CategoryChips`, `Button`, `StatusRegion`, `Banner`, `EmptyState`) |
| `src/app/dev/ui/page.tsx` | Component gallery; 404 unless `ENABLE_UI_GALLERY=1` |
| `vercel.json` | Install and build commands for Vercel |
| `src/app/api/today/route.ts` | `GET /api/today`, wiring only; the proxy logic is `features/feed/adapters/todayRoute.ts` |
| `src/features/feed/` | The core loop: `domain/` (bearer parsing, upstream and response classification, 24 hour filter), `adapters/` (proxy handler, `/api/today` client, token store), `ui/` (`FeedApp` root, `SetupForm`, `Feed`) |

## Commands

```bash
pnpm --filter web dev           # next dev --webpack, service worker disabled
pnpm --filter web build         # next build --webpack
pnpm --filter web test          # Vitest (src/**/*.test.ts)
pnpm --filter web test:e2e      # Playwright WebKit iPhone: one build, two servers (gallery on :4791, off :4792)
```

## Conventions

- Always build with `--webpack` (dev and prod); Serwist does not support Turbopack.
- `/` stays static: no `cookies()` or `headers()` reads, or the offline precache breaks.
- Data never goes through the service worker; the snapshot lives in IndexedDB via TanStack Query.
- Secrets (`APP_TOKEN`, `SCRIPT_URL`, `SCRIPT_KEY`) are server only and read through `src/env.ts`.
- Build UI from the design system: tokens only (no raw hex, no `px` font sizes, no Tailwind default palette, which is switched off), and the base components from `@/features/design-system/ui`.
- `src/features/design-system/` is the one feature others may import from, and only through `ui/index.ts`; ESLint blocks deep imports (alias, relative, or sibling).
- New variant components use `class-variance-authority`; type a required variant as `NonNullable<VariantProps<…>["variant"]>`, because cva adds `null`.
- One sanctioned `process.env` read outside `src/env.ts`: `NODE_ENV` in `design-system/ui/isDevelopment.ts` (a build constant, for dev only guards in client components).
- `ENABLE_UI_GALLERY` stays unset in every deployed environment (Vercel included).
- `APP_TOKEN`, `SCRIPT_URL` (https only) and `SCRIPT_KEY` are required and trimmed. Locally they go in `.env.local` (Vercel's are hidden secrets, so `vercel env pull` cannot fetch them); CI (`.github/workflows/ci.yml`) and the Playwright servers set dummy values, and tests never call Apps Script.
- The phone stores only its token, in IndexedDB through `idb-keyval` (key `appToken`).
- `/api/today` answers only a valid snapshot (200, `no-store`), a bare 401, or the 502 `internal` envelope, and logs a fixed stage name, never the upstream URL.
- Components are tested in Playwright WebKit against the `/dev/ui` gallery (real layout, fonts, axe), not jsdom; add new component states to the gallery.

## Gotchas

- iOS keeps Safari and home screen storage separate; setup must happen inside the installed app.
- Playwright WebKit is not a real home screen PWA; check each slice on the phone too.
- Vercel function responses cap near 4.5MB; the snapshot is 1 to 2MB today.
- `page.route` cannot see `/api/*` requests the service worker makes, so e2e specs that fake `/api/today` block service workers (`serviceWorkers: "block"`).
- To simulate a return to the foreground, dispatch `visibilitychange` with `bubbles: true`; TanStack Query listens on `window`.
- `next build` typechecks test files too, so a failing type assertion in a `*.test.ts` breaks the production build and the e2e run.
- Builds fetch the fonts from Google (`next/font/google`), so a build needs network access.
- Plain Tab in WebKit skips links and buttons (Safari's default); e2e focus walks use `Alt+Tab`.

## Agent skills

- [tanstack-query](../../.agents/skills/tanstack-query/): `tanstack-skills/tanstack-skills`, query and persister patterns
- [tailwind-4-docs](../../.agents/skills/tailwind-4-docs/): `lombiq/tailwind-agent-skills`, Tailwind v4 reference
- [tailwind-design-system](../../.agents/skills/tailwind-design-system/): `wshobson/agents`, tokens and components
- [next-bundle-optimizer](../../.agents/skills/next-bundle-optimizer/): `vercel/next.js`, bundle size
- [cva-best-practices](../../.agents/skills/cva-best-practices/): `joe-bell/cva`, variant components (this repo uses stable `class-variance-authority`, not the 1.0 beta)
- [web-styling-cva](../../.agents/skills/web-styling-cva/): `agents-inc/skills`, cva composition and compound variants
- [axe-core](../../.agents/skills/axe-core/): `claude-dev-suite/claude-dev-suite`, automated accessibility scans

## Related specs

- [0001 stack & architecture](../../docs/specs/0001-stack-architecture/index.md)
- [0003 design system & UI foundation](../../docs/specs/0003-design-system-ui-foundation/index.md)
- [0004 core loop: today's feed](../../docs/specs/0004-core-loop-todays-feed/index.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
