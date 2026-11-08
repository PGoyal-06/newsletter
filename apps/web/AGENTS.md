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
| `vercel.json` | Install and build commands for Vercel |

## Commands

```bash
pnpm --filter web dev           # next dev --webpack, service worker disabled
pnpm --filter web build         # next build --webpack
pnpm --filter web test          # Vitest (src/**/*.test.ts)
pnpm --filter web test:e2e      # Playwright WebKit iPhone, builds and runs next start
```

## Conventions

- Always build with `--webpack` (dev and prod); Serwist does not support Turbopack.
- `/` stays static: no `cookies()` or `headers()` reads, or the offline precache breaks.
- Data never goes through the service worker; the snapshot lives in IndexedDB via TanStack Query.
- Secrets (`APP_TOKEN`, `SCRIPT_URL`, `SCRIPT_KEY`) are server only and read through `src/env.ts`.

## Gotchas

- iOS keeps Safari and home screen storage separate; setup must happen inside the installed app.
- Playwright WebKit is not a real home screen PWA; check each slice on the phone too.
- Vercel function responses cap near 4.5MB; the snapshot is 1 to 2MB today.

## Agent skills

- [tanstack-query](../../.agents/skills/tanstack-query/): `tanstack-skills/tanstack-skills`, query and persister patterns
- [tailwind-4-docs](../../.agents/skills/tailwind-4-docs/): `lombiq/tailwind-agent-skills`, Tailwind v4 reference
- [tailwind-design-system](../../.agents/skills/tailwind-design-system/): `wshobson/agents`, tokens and components
- [next-bundle-optimizer](../../.agents/skills/next-bundle-optimizer/): `vercel/next.js`, bundle size

## Related specs

- [0001 stack & architecture](../../docs/specs/0001-stack-architecture/index.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
