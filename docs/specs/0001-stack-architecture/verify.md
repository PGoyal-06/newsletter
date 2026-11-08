# Verify: Stack & architecture · spec 0001 · updated 2026-11-07
_Steps derived from the scope's Done when and the spec's scaffold gate (spec 0001 has no numbered ACs; D-N below maps to them). `/check verify` runs these; `/test` locks the durable ones._

- D-1: the stack is recorded in a spec
- D-2: the script project deploys
- D-3: the web app deploys
- D-4: the empty web app installs to the iPhone home screen and opens offline from the Serwist precache (scaffold gate)
- D-5: the worker's post build check passes and catches a missing entry point (scaffold gate)
- D-6: a contract mismatch fails the typecheck across packages

## Commands
- [ ] `pnpm install --frozen-lockfile` at the repo root → succeeds, esbuild postinstall runs → D-3
- [ ] `pnpm typecheck` → contract, script, web all pass → D-6
- [ ] `pnpm --filter script build` → prints `entry points OK: doGet, onTimer, installTriggers`; `dist/` holds only `Code.js` and `appsscript.json` → D-5
- [ ] Remove the `g.onTimer = onTimer;` line from `apps/script/src/main.ts`, then build → exits 1 with `entry points not assigned to globalThis: onTimer`; put the line back → D-5
- [ ] `pnpm --filter web build` → the `/` route shows `○ (Static)`; `apps/web/public/sw.js` exists and its precache list includes `{'url':'/'}` → D-3, D-4
- [ ] Change `CONTRACT_VERSION` in `packages/contract/src/index.ts` to a string, then run a typecheck in a package that imports it with a number typed use → fails (only meaningful once spec 0002 adds real shapes; for now confirm both apps import the package) → D-6

## UI / manual (browser)
- [ ] `pnpm --filter web start -p <free port>`, open `/` in a browser → "Morning Feed" heading and the placeholder line render → D-3
- [ ] DevTools, Application: the service worker `/sw.js` is activated; the precache holds `/` and the `_next/static` chunks → D-4
- [ ] Switch DevTools to Offline and reload `/` → the page still renders from the precache → D-4
- [ ] `/manifest.webmanifest` → `display: standalone`, `start_url: /`, icons `/icon/192` and `/icon/512` load as PNG; `/apple-icon` loads as a 180px PNG → D-4
- [ ] Any `/api/*` request while offline fails over the network, with no cached fallback (NetworkOnly) → D-4

## Deploy and phone (needs your accounts)
- [ ] Do steps 1 to 3 of `apps/script/README.md`; `pnpm --filter script deploy` updates the existing deployment, and the `/exec` URL returns `{"status":"scaffold","contractVersion":0}` → D-2
- [ ] Apps Script, Triggers: exactly one time driven trigger for `onTimer` every 15 minutes; run `installTriggers` again → still exactly one → D-2
- [ ] Vercel project: Root Directory `apps/web`, include files outside the root directory turned on; a push to `main` deploys green using `apps/web/vercel.json` (frozen lockfile install, typecheck, then build) → D-3
- [ ] On the iPhone in Safari: open the production URL, Share, Add to Home Screen → the "Morning" icon appears; launching it opens with no Safari toolbar → D-4
- [ ] Open the home screen app once online, then turn on Airplane Mode, force quit and relaunch it → the shell opens offline → D-4

## Acceptance criteria coverage
- D-1 covered by spec 0001 (`Status: In Progress`) · D-2 by the deploy and trigger steps · D-3 by install, web build, browser render, Vercel deploy · D-4 by the service worker, offline, manifest, and iPhone steps · D-5 by the build check and the removal test · D-6 by typecheck
