# Mail worker (Google Apps Script)

Reads and labels your Gmail every 15 minutes and serves today's newsletters as JSON through `doGet`.
Source is TypeScript in `src/`; `pnpm build` bundles it into `dist/Code.js` with esbuild, and clasp pushes `dist/`.

Only `src/main.ts` touches Apps Script globals. Every entry point must be assigned to `globalThis` there
**and** listed in `ENTRY_POINTS` in `scripts/build.mjs`, or the build fails.

## Commands

| Command | What it does |
|---|---|
| `pnpm --filter script build` | Bundle to `dist/`, copy `appsscript.json`, check every entry point exists |
| `pnpm --filter script deploy` | Typecheck, test, build, `clasp push`, then update the existing web app deployment so its URL never changes |

## One time setup (do these in order)

- [ ] **1. Log in and create the project.** From `apps/script/`:
  ```sh
  pnpm exec clasp login
  pnpm exec clasp create --type standalone --title "Morning Feed worker" --rootDir dist
  ```
  Commit `.clasp.json` (the script ID is not a secret). Never commit `~/.clasprc.json`: it is your Google login.
  If `clasp create` wrote its own `appsscript.json` into `dist/`, ignore it; the build replaces it with the committed one.
- [ ] **2. First deploy, then create the web app deployment once.** Run `pnpm --filter script deploy` (it pushes, then tells you no deployment ID exists yet).
  In the Apps Script editor: Deploy, New deployment, type Web app, Execute as **Me**, Who has access **Anyone**.
  Copy the deployment ID into `deploy.json` and commit it. Save the `/exec` URL for step 4.
- [ ] **3. Install the trigger and grant access.** In the editor, pick `installTriggers` in the Run menu and run it.
  Google shows a consent screen for Gmail (read, label, archive), Drive (only files this script creates), and managing this script's own triggers. Allow it.
  Running it again is safe: it replaces the trigger rather than adding a second one.
- [ ] **4. Set the secrets.** Generate two with `openssl rand -base64 32`.
  - Apps Script, Project Settings, Script Properties: `SCRIPT_KEY`.
  - Vercel project env (Production and Preview): `APP_TOKEN`, `SCRIPT_URL` (the `/exec` URL), `SCRIPT_KEY` (same value as above).

After this, every later change ships with `pnpm --filter script deploy`.
