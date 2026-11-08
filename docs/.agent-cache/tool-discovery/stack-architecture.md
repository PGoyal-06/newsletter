# Tool discovery: stack-architecture

Date: 2026-11-07
Method: `npx -y skills find <tool>` per item, then `npx -y skills add <owner/repo> --list` to confirm. Project-installed skills (`npx skills list`) are only the jsmastery workflow skills, so none were excluded. Vercel plugin skills were not offered.
Nothing was installed.

## Skills

### Next.js 16 (next)
- vercel/next.js@next-dev-loop: verify runtime behavior of a running `next dev` via /_next/mcp plus a browser. Source: first-party (vercel/next.js repo). Confirmed via --list. Note: overlaps conceptually with vercel:nextjs.
- vercel/next.js@next-cache-components-adoption: enable Cache Components and resolve blocking routes. First-party. Confirmed via --list.
- vercel/next.js@next-cache-components-optimizer: grow the static shell, needs Next 16.3+. First-party. Confirmed via --list.
- vercel/next.js@next-partial-prefetching-adoption and @next-partial-prefetching-optimizer: Partial Prefetching setup and tuning. First-party. Confirmed via --list.
- vercel/next.js@next-bundle-optimizer: reduce client bundle size. First-party. Confirmed via --list.
- vercel-labs/openreview@next-best-practices: Next.js best practices. Vercel Labs, community-level. Found via find only.

### Serwist (@serwist/next)
- none found. Search for "serwist" and "@serwist/next" returned only generic Next PWA skills.
- Generic PWA candidates (community, Serwist coverage NOT verified): just-mpm/conformai@nextjs-pwa (its repo clone failed auth, so unconfirmed); jakerains/agentskills@nextjs-pwa (clone failed auth, unconfirmed); juanmorales1810/pwa-service-worker@pwa-service-worker (not list-checked).

### TanStack Query (@tanstack/react-query)
- tanstack-skills/tanstack-skills@tanstack-query: TanStack org skill repo. Confirmed via --list. Official-org-owned (tanstack-skills is the TanStack org's own skills repo name, not verified as the TanStack maintainers' repo).
- deckardger/tanstack-agent-skills@tanstack-query-best-practices (13.1K installs): community. Found via find only.
- casper-studios/casper-marketplace@tanstack-react-query-best-practices (12 installs): community. Found via find only.

### Tailwind CSS v4 (tailwindcss)
- hairyf/skills@tailwindcss: community. Confirmed via --list.
- lombiq/tailwind-agent-skills@tailwind-4-docs (18.4K installs): community, Tailwind v4 docs. Found via find only.
- wshobson/agents@tailwind-design-system (72.4K installs): community. Confirmed in wshobson/agents repo (185 skills) via find; list did not show it in the printed portion.
- No first-party tailwindcss-labs skill found.

### Google Apps Script / clasp (@google/clasp, google-apps-script)
- bootgs/skills@apps-script-clasp-workflow: clasp push, deploy, versioning, dev/staging/prod setups. Community. Confirmed via --list.
- bootgs/skills@apps-script-services, apps-script-triggers, apps-script-ui: quota-safe services, triggers, menus/dialogs. Community. Confirmed via --list.
- tnisizawa/clasp-skill@clasp: clasp push/deploy/logs (Japanese/English). Community. Confirmed via --list.
- googleworkspace/cli@gws-apps-script (629 installs) and @gws-apps-script-push (620 installs): Google Workspace org's CLI repo. First-party-org. Found via find, and the repo has 95 skills. The name did not appear in the --list output I grepped, so treat as UNVERIFIED.
- jezweb/claude-skills@google-apps-script (2K installs): community. Found via find only.

### esbuild
- mindrally/skills@esbuild-bundler (719 installs): community. Confirmed via --list.
- claude-dev-suite/claude-dev-suite@esbuild (28 installs): community. Found via find only.
- No first-party esbuild skill found.

### DOMPurify (dompurify)
- none found for DOMPurify usage. Results were security-testing skills (e.g. dreadnode/capabilities@dompurify-mxss-bypass, elementalsouls/claude-bughunter@hunt-dom). These are offensive pentest skills, not library guidance, so they are not offered.

### Vitest (vitest)
- antfu/skills@vitest (46.8K installs): Anthony Fu, community, high-trust Vite/Vitest ecosystem maintainer. Confirmed via --list.
- pproenca/dot-skills@vitest (7K installs): community. Found via find only.
- No first-party vitest-dev skill found.

### React Testing Library (@testing-library/react)
- itechmeat/llm-code@react-testing-library (1.4K installs): community. Confirmed via --list.
- pproenca/dot-skills@react-testing-library (417 installs): community. Confirmed via --list.
- No first-party testing-library skill found.

### Playwright (playwright)
- microsoft/playwright@playwright-dev: explains how to develop Playwright itself (contributor-focused, not for app tests). First-party (microsoft/playwright repo). Confirmed via --list. Likely not what an app team needs.
- microsoft/playwright-cli@playwright-cli (210K installs): automate browsers and work with Playwright tests. First-party (microsoft/playwright-cli repo). Confirmed via --list.
- openai/skills@playwright (9.2K installs): OpenAI, community/third-party to Microsoft. Confirmed via --list.
- currents-dev/playwright-best-practices-skill@playwright-best-practices (103.3K installs): community. Found via find only.

### pnpm workspaces
- oakoss/agent-skills@pnpm-workspace (188 installs): community. Confirmed via --list.
- agents-inc/skills@shared-monorepo-pnpm-workspaces (70 installs): community. Found via find only.
- No first-party pnpm skill found.

## MCP servers (up to 3 web searches, first-party only)

- Playwright: official `microsoft/playwright-mcp` (npm `@playwright/mcp`, Apache-2.0, Microsoft). Source: github.com/microsoft/playwright-mcp. Latest release reported as v0.0.84 on the releases page. Setup: `npx @playwright/mcp@latest`.
- Next.js: official `vercel/next-devtools-mcp` (npm `next-devtools-mcp`). Connects to the built-in `/_next/mcp` endpoint of Next.js 16+ dev servers. Source: github.com/vercel/next-devtools-mcp, nextjs.org/docs/app/guides/mcp. Latest release reported as v0.4.0. Setup: `npx -y next-devtools-mcp@latest`.
- Google Apps Script: no separate Google-built Apps Script MCP found. The `google/clasp` repo has an experimental `clasp mcp` mode (`npx -y @google/clasp mcp`), latest release v3.4.1. Its support status is unclear, since the README says "not an officially supported Google product." Source: github.com/google/clasp. Third-party alternatives exist (Utakata/google-apps-script-mcp, abdulaaly/gas-hybrid-mcp) but are not official and were not checked for maintenance.
- Serwist, TanStack Query, Tailwind, esbuild, DOMPurify, Vitest, RTL, pnpm: no official MCP server searched or found. Not searched beyond the Playwright, Next.js, and Apps Script queries.

## Gaps
- DOMPurify and Serwist: no library-specific skill found.
- googleworkspace/cli@gws-apps-script: found via find, not confirmed through --list.
- just-mpm and jakerains nextjs-pwa: clone failed on auth, so not confirmed.
