# Mail worker (apps/script)

## Overview

Google Apps Script project that runs as your account: a 15 minute trigger reads and labels Gmail, and `doGet` serves today's snapshot as JSON. TypeScript in `src/`, bundled by esbuild into one `dist/Code.js`, pushed by clasp.

## Key files

| File | Owns |
|---|---|
| `src/main.ts` | The only file that touches Apps Script globals; assigns every entry point to `globalThis` |
| `scripts/build.mjs` | Bundle, copy manifest, fail if an entry point is missing (`ENTRY_POINTS`) |
| `scripts/deploy.mjs` | `clasp push`, then `clasp update-deployment` on the ID in `deploy.json` |
| `appsscript.json` | Manifest: pinned scopes, web app access, timezone |
| `README.md` | One time setup checklist |

## Commands

```bash
pnpm --filter script build      # bundle to dist/ and run the entry point check
pnpm --filter script test       # Vitest
pnpm --filter script release    # typecheck, test, build, push, redeploy (same /exec URL)
```

## Conventions

- New entry point: assign it in `src/main.ts` AND add it to `ENTRY_POINTS` in `scripts/build.mjs`, or the build fails.
- Only `src/main.ts` and `adapters/` may reference Apps Script globals (`GmailApp`, `DriveApp`, `ScriptApp`, `ContentService`, `PropertiesService`); domain code takes facades so Vitest can fake them.
- Scopes are pinned in `appsscript.json` (`gmail.modify`, `drive.file`, `script.scriptapp`); adding one is a spec decision, and a test locks the list.
- Never trash or delete mail; label and archive only.

## Gotchas

- Apps Script has no modules: a function not assigned to `globalThis` is silently dropped by tree shaking.
- `doGet` cannot read headers, so the `key` query param is its only credential; never log the URL.
- clasp pushes whatever is in `dist/`; always ship through `release`, which rebuilds first.
- `~/.clasprc.json` is your Google login; never commit it.

## Agent skills

- [apps-script-clasp-workflow](../../.agents/skills/apps-script-clasp-workflow/): `bootgs/skills`, clasp push vs deploy, versions
- [apps-script-triggers](../../.agents/skills/apps-script-triggers/): `bootgs/skills`, installable triggers and quotas

## Related specs

- [0001 stack & architecture](../../docs/specs/0001-stack-architecture/index.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
