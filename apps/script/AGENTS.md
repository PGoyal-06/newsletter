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
| `src/<feature>/{domain,adapters}` | Feature folders: `mail/` (Gmail facade, sender parsing), `snapshot/` (assembly, Drive store, publish), `serve/` (`doGet` logic), `run/` (one timer run), `settings/` (Script Properties) |
| `src/check.ts` | `checkDriveAccess`, an editor only check of Drive access under `drive.file` and the `label:Newsletters` count |
| `src/testing/fakes.ts` | Fakes for the Gmail message, Drive store, and Script Properties facades; test only |

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
- Drive goes only through the Drive advanced service (v3, enabled under `dependencies.enabledAdvancedServices` in `appsscript.json`, which a test locks), never `DriveApp`, so the pinned `drive.file` scope is enough (spec 0004).
- Script Properties the worker uses: `SCRIPT_KEY` (the `doGet` secret), `snapshotFileId` (the published snapshot), `snapshotFolderId` (the `Morning Feed snapshots` folder it creates).
- Logs carry stage names and counts only: never a secret, URL, subject, sender address, or body.

## Gotchas

- Apps Script has no modules: a function not assigned to `globalThis` is silently dropped by tree shaking.
- `doGet` cannot read headers, so the `key` query param is its only credential; never log the URL.
- clasp pushes whatever is in `dist/`; always ship through `release`, which rebuilds first.
- `~/.clasprc.json` is your Google login; never commit it.
- `Drive.Files.get(id, { alt: "media" })` returns a JSON file already parsed, with its own key order; the adapter serializes it back, so compare snapshots by meaning (`isTodaySnapshot`), never by exact text.
- Gmail search for a parent label does not match threads that carry only a sublabel, and the search box spells nested labels in lowercase with hyphens (`Newsletters/Test` is `label:newsletters-test`). Put the parent `Newsletters` label on each thread itself.

## Agent skills

- [apps-script-clasp-workflow](../../.agents/skills/apps-script-clasp-workflow/): `bootgs/skills`, clasp push vs deploy, versions
- [apps-script-triggers](../../.agents/skills/apps-script-triggers/): `bootgs/skills`, installable triggers and quotas

## Related specs

- [0001 stack & architecture](../../docs/specs/0001-stack-architecture/index.md)
- [0004 core loop: today's feed](../../docs/specs/0004-core-loop-todays-feed/index.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
