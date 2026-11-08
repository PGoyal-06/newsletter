# Morning Newsletter Feed

## Stack

- **Language / Runtime**: TypeScript (`strict`) everywhere; Node 24 LTS locally and on Vercel; Apps Script V8 for the worker
- **Halves**: `apps/script` (Gmail worker, esbuild bundle, clasp 3) and `apps/web` (Next.js 16 App Router PWA on Vercel, Serwist, Tailwind v4), sharing `packages/contract`
- **Package manager**: pnpm workspace, version pinned by root `packageManager`; exact versions, lockfile committed
- Source of truth: [spec 0001](docs/specs/0001-stack-architecture/index.md)

## Build approach

**Tracer Bullet**: prove one real thread from Gmail to the phone first, then thicken one strand per slice.

## Commands

```bash
pnpm install --frozen-lockfile     # install (root)
pnpm --filter web dev              # dev server (service worker off in dev)
pnpm lint                          # ESLint, whole workspace
pnpm format                        # Prettier write (format:check in CI)
pnpm typecheck                     # all packages
pnpm test                          # unit tests, all packages (Vitest)
pnpm --filter web test:e2e         # Playwright, WebKit iPhone profile, production build
pnpm --filter script release       # ship the worker: typecheck, test, build, push, redeploy
```

## Specs

`docs/specs/NNNN-title.md` (or `NNNN-title/index.md`); scope in `docs/scope/scope.md`.

## Rules

- **Clean Architecture, light**: pure `domain/` logic with no Google, Next, or `fetch` imports; `adapters/` wrap the outside world behind interfaces the domain defines; entry points call features, never the reverse. Add a use case layer only when a feature needs orchestration.
- **Feature folders, layers inside**: `src/<feature>/{domain,adapters}` in the worker; `src/features/<feature>/{domain,adapters,ui}` in the web app, with `src/app/` holding only routes.
- Data crossing the worker and web boundary is a plain type from `packages/contract`; never a Gmail or framework object.
- One error pattern: return the typed error envelope from the contract (spec 0002); no ad hoc error shapes per feature.
- Validate env at startup (`apps/web/src/env.ts`); never read `process.env` elsewhere.
- Named exports only, except where Next requires a default (pages, layouts, `manifest.ts`, icon and route files).
- Accessibility baseline: WCAG 2.2 AA on all UI.
- Conventional commits (`feat(web): …`, `fix(script): …`).
- No package script may be named after a pnpm built in command (`deploy`, `install`, …); a test enforces it.

## Tooling

Installed (scope feature 2); config in `eslint.config.mjs`, `.prettierrc.json`, `.husky/`, `.lintstagedrc.json`, `.github/workflows/ci.yml`:
- ESLint (flat config) with typescript-eslint, plus `eslint-config-next` and React hooks rules in `apps/web`; Prettier for formatting.
- Pre-commit (husky + lint-staged): lint and format staged files, typecheck all packages.
- GitHub Actions on push: lint, typecheck, unit tests (Playwright optional).

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Agent skills

- [vitest](.agents/skills/vitest/): `antfu/skills`, unit test conventions
- [playwright-cli](.agents/skills/playwright-cli/): `microsoft/playwright-cli`, driving browsers for tests
- [playwright-best-practices](.agents/skills/playwright-best-practices/): `currents-dev/playwright-best-practices-skill`, e2e test structure
- [setup-pre-commit](.agents/skills/setup-pre-commit/): `mattpocock/skills`, husky + lint-staged setup; our hook runs ESLint and Prettier on staged files plus typecheck, no tests, and never auto commits
- [github-actions-hardening](.agents/skills/github-actions-hardening/): `github/awesome-copilot`, secure CI workflows (pinned actions, least privilege tokens)

Declined: lint-staged (lint-staged.sh), linting-neostandard-eslint9, typescript-eslint (claude-dev-suite), antfu, github-actions-templates, Playwright MCP, apps-script-services, clasp (tnisizawa), tailwindcss (hairyf), react-testing-library, pnpm-workspace, esbuild-bundler, next-dev-loop, Next.js Cache Components and Partial Prefetching skills
MCP servers: next-devtools (connected), clasp (connected, acts with your Gmail scoped login)

## Context files

- [apps/script/AGENTS.md](apps/script/AGENTS.md): Gmail worker on Apps Script, bundling and deploy rules
- [apps/web/AGENTS.md](apps/web/AGENTS.md): Next.js PWA, offline shell and service worker rules
- [packages/contract/AGENTS.md](packages/contract/AGENTS.md): shared data contract, source only

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
