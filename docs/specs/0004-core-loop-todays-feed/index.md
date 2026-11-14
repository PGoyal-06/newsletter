# 0004. Core loop: Gmail to today's feed on the phone

**Date**: 2026-11-13
**Revised**: 2026-11-13, after the task 1 phone test: rows keep opening Gmail in a new tab (matching spec 0003), and the row destination line follows the item's category (amends spec 0003 AC-4)
**Status**: In Progress

## Summary

This is the first slice that moves real mail. Every 15 minutes the worker finds new newsletters in your inbox (anything with a List-Unsubscribe header), labels them, and publishes a fresh snapshot of the last 24 hours to Drive. The phone app asks for your secret key once, then shows today's issues as cards that open in Gmail. Nothing is archived yet, there is no in app reader, and nothing works offline yet. Those are later slices. If the timer was down, the worker catches up on the mail it missed, and a refresh request (`refresh=1`) can run the same job on demand within a time limit.

## Requirements

**User stories**:
- As the reader, I want today's newsletters to appear on my home screen app without opening Gmail, so the inbox count never greets me.
- As the reader, I want a wrong secret key to send me to setup, and a broken server to only show an error, so I never retype a key that was fine.
- As the builder, I want missed runs to catch up on their own, so no newsletter is left unlabeled in the inbox after an outage.

**Acceptance criteria** (the contract):
- **AC-1**: Each run labels every message newer than the processing marker (searched across all mail except trash, spam, and sent, so a newsletter you archive within minutes is still caught) that has a `List-Unsubscribe` header, nonempty after trimming. Its thread gets the `Newsletters` label plus `Newsletters/<Category>` (the category from the current map, or `Newsletters/Unsorted`). A label already on the thread is not written again. Messages without the header are left alone. No message is ever archived, trashed, or deleted in this slice.
- **AC-2**: Processing catches up. The first run starts 24 hours back. After a gap of up to 7 days, later runs process every missed message, oldest first. Every planned message the loop passes counts as processed, including ones that are not newsletters and ones skipped for an unparseable sender. `lastProcessedAt` moves forward only to cover processed messages, so a run cut short by its time budget resumes on the next run. If the thread listing hits its cap, the marker moves no further than the oldest listed message, so the next run continues from there. Running the same window twice changes nothing.
- **AC-3**: Every completed timer run publishes a new snapshot that meets spec 0002 (24 hour window, ordering, `listIds` then `senders` lookup, content variants, Unsorted with no body read), even when no new mail arrived. Its candidates come from a `label:Newsletters newer_than:2d` search merged with the messages this run labeled. Messages in trash and messages with an unparseable sender are skipped (logged), and only a failure of the whole snapshot aborts the run.
- **AC-4**: On each rebuild, every newsletter thread inside the 24 hour window has its labels under `Newsletters/` set to exactly the current categories of its in window newsletter messages. Labels you added by hand under `Newsletters/` are removed too. The parent `Newsletters` label stays, labels outside `Newsletters/` are never touched, and a thread whose labels already match gets no write. Threads outside the window are not touched.
- **AC-5**: Publication follows spec 0002's protocol, using the Drive advanced service (Google's Drive API switched on inside Apps Script) under the existing `drive.file` permission. Each run writes a new file into the worker's snapshot folder, reads it back, and validates it. The pointer swap is reconciled by rereading the pointer. The marker updates only after a confirmed publish. The previous file is kept. Cleanup permanently deletes only snapshot folder files older than 1 hour that are neither the current nor the previous file, and is skipped when the pointer cannot be read. A missing or trashed snapshot folder is recreated and its new ID stored. A failure before the swap leaves the pointer and the marker unchanged. This amends spec 0002, which said older files are trashed.
- **AC-6**: Only one run executes at a time (script lock). If the lock is busy, the timer skips that run. Budgets are measured from run start and include thread listing: the timer stops processing new messages after 3 minutes, and a refresh after 12 seconds (a refresh lists only one page of 100 threads). Both still rebuild and publish what is done. A hard stop at 5 minutes, checked before the Drive write, fails the run with `run_overbudget`. Every outcome except a skipped run that is not a success throws from `onTimer`, so Google's failure email fires.
- **AC-7**: `doGet` with the correct `key` returns the current snapshot as JSON. A missing or wrong key returns `bad_key` (the comparison takes the same time whether the key is right or wrong). With `refresh=1`, it runs a time boxed full run. If that run labeled something new, it rebuilds, publishes, and returns the new snapshot. If nothing new was labeled, it skips the rebuild and returns the current snapshot. If the lock is busy or the refresh run fails, it returns the current published snapshot. A missing or unreadable pointer, or a missing, unparseable, or invalid file, returns `internal`. This amends spec 0002, which said a failed refresh returns `internal`. Timer and `doGet` logs never contain a secret, URL, subject, sender address, or body.
- **AC-8**: `/api/today` checks `Authorization: Bearer <APP_TOKEN>` before calling upstream. The word `Bearer` matches in any letter case, followed by one space, and the rest must equal the token exactly. A missing, malformed, or wrong value returns a bare 401. A valid upstream snapshot returns 200 with `Cache-Control: no-store`. Upstream `bad_key`, `internal`, a non JSON body, an invalid snapshot, or a timeout after 25 seconds returns 502 with `{ "ok": false, "error": "internal" }`. Only the literal `refresh=1` is passed through to the worker. The upstream URL is never logged.
- **AC-9**: With no stored token, `/` shows the setup state: a visible "Secret key" label, a mono input (`autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`), and an "Open today's feed" button. Saving trims the pasted value, then calls `/api/today` with it. While the call runs, the button is disabled and shows "Checking…". A 401 shows error text under the field with a 2px error border and saves nothing. Any other outcome stores the token in IndexedDB, asks for persistent storage, and shows the feed. A 200 response fills the feed directly, with no second fetch. If IndexedDB throws, setup shows "Couldn't save the key on this phone. Try again." and stays open. A quiet "Change secret key" link at the bottom of the feed opens setup with a Cancel action. The stored token is kept until a new one is saved.
- **AC-10**: The feed shows a masthead (today's date formatted with `Intl` in the phone's locale, plus "Updated <time>" from `generatedAt`), then one `IssueRow` per item, newest first. Each row shows sender, subject, and arrival time in the phone's timezone. Items older than 24 hours by the phone's clock are hidden. Every row, mapped or Unsorted, links to its `gmailUrl` in this slice, and its third line says where the tap goes: "Unsorted · opens in Gmail" for an Unsorted item, "Opens in Gmail" for a mapped item (amends spec 0003 AC-4). With no items, it shows "Nothing new today." and "Everything older is in Gmail under Newsletters." The feed refetches every time the app opens and every time it comes back to the foreground (`staleTime` 0; only requests already in flight are deduplicated). The `checking` state renders nothing (no spinner).
- **AC-11**: A 401 from `/api/today` switches to setup with the text "That key stopped working. Paste the current one." It is never retried automatically. Any other failure (502, timeout, offline, or an invalid body) keeps the feed state. It shows the stale banner reading "Couldn't load today's newsletters." with a Retry action, keeps any items already loaded in this session, and retries automatically at most once, after 2 seconds.
- **AC-12**: Running `listNewsletterHeaders()` in the Apps Script editor searches `newer_than:7d -in:trash -in:spam` (up to 500 threads) for messages with `List-Unsubscribe`. It logs one line per distinct (normalized List-Id, normalized sender address) pair: `listId | email | name | count`, using the most frequent display name. It never logs subjects or bodies and changes nothing. It is the one editor only exception to AC-7's no addresses in logs rule.
- **AC-13**: The category map is a typed constant in the worker code. It is validated with `isCategoryMap` at the start of every run. Per spec 0002's amended invariant 7, the shared validator itself enforces the Gmail label rules: no `/` in a category name, names unique ignoring letter case, and at most 100 characters. An invalid map fails the run before any write. Before the phone check, it holds at least one real mapped sender taken from AC-12's output.
- **AC-14**: On the real iPhone, with the app installed to the home screen: a newsletter that arrives shows up as a card by the end of the first timer run that starts after Gmail search can see it (in practice, within 15 minutes plus that run's duration). A mapped issue's HTML content reaches the phone, and the logged snapshot size is recorded. Tapping a card opens that thread in Gmail, and where it lands is recorded (Gmail app, Gmail web thread, or Gmail inbox). Tapping Done in the Safari sheet returns to the feed with its state intact. A wrong key sends you to setup. A forced server error (a wrong `SCRIPT_KEY` in Vercel) shows the error banner and does not open setup.
- **AC-15**: Every run logs the serialized snapshot size in bytes. If it is over 4MB (under Vercel's roughly 4.5MB response limit), the run fails with `snapshot_too_large` before publishing, which triggers the failure email. The snapshot is never cut short silently.
- **AC-16**: Every run logs its duration. If timer runs average over 30 seconds across a day, the worker switches to its preset fallback: rebuild only when this run labeled new mail, the category map changed (a hash stored in Script Property `categoryMapHash`), or the published snapshot is older than 60 minutes. The switch is one constant in code and needs no new decision.

## Decision

**Chosen option**: Option 1: a label driven worker that processes oldest first, catches up, and rebuilds every run, with the setup and feed as states of the static `/` shell.

The worker labels new newsletters, finds the last 24 hours through a parent `Newsletters` label, fixes in window labels to match the current map, and publishes a new Drive snapshot on every run under a script lock. `doGet` serves it, or runs a time boxed refresh. The proxy route guards it with the app token. The static `/` page reads the token from IndexedDB and shows either setup or the feed, using TanStack Query with no persister yet.

**Implementation skills**: `apps-script-triggers` (`bootgs/skills`, `.agents/skills/apps-script-triggers/`) · `apps-script-clasp-workflow` (`bootgs/skills`, `.agents/skills/apps-script-clasp-workflow/`) · `tanstack-query` (`tanstack-skills/tanstack-skills`, `.agents/skills/tanstack-query/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.agents/skills/playwright-best-practices/`) · `axe-core` (`claude-dev-suite/claude-dev-suite`, `.agents/skills/axe-core/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Worker layout

Feature folders under `apps/script/src/`, following `AGENTS.md` (pure `domain/`, `adapters/` behind interfaces the domain defines; only `main.ts` and `adapters/` touch Apps Script globals):

| Folder | Owns |
|---|---|
| `settings/` | Decode Script Properties into `ScriptSettings` plus the two worker private properties; malformed values fail, missing ones take spec 0002 defaults |
| `categories/` | `categoryMap.ts` (the typed `CategoryMap` constant), lookup (`listIds` own property first, then `senders`, else `Unsorted`) |
| `mail/` | Detection, processing plan (oldest first, budget, marker), label plan for processing and rebuild, `listNewsletterHeaders`; Gmail facade |
| `snapshot/` | Assemble and validate the snapshot; Drive facade; publish protocol, reconcile, cleanup |
| `run/` | The use case that orchestrates one run (lock, settings, process, rebuild, publish, marker, cleanup) for both `timer` and `refresh` modes |
| `web.ts` | `doGet`: key check, refresh, read current snapshot |

New entry point `listNewsletterHeaders` is assigned in `main.ts` and added to `ENTRY_POINTS` in `scripts/build.mjs`.

### Data model sketch

No database. Stored state, confirmed with the engineer (items marked new are not in spec 0002):

| Where | Item | Type | Rules |
|---|---|---|---|
| Script Properties | `SCRIPT_KEY` | string | Missing: configuration failure (`internal`) |
| Script Properties | `lastProcessedAt` | decimal epoch ms, optional | Missing: run start minus 24 hours. Advances only after confirmed publish |
| Script Properties | `archivingEnabled` | `"true"` or `"false"`, optional | Decoded and validated, unused until slice 4. Missing: `false` |
| Script Properties | `snapshotFileId` | Drive file ID, optional | The published pointer |
| Script Properties | `previousSnapshotFileId` (new) | Drive file ID, optional | The file retained until the next confirmed publish |
| Script Properties | `snapshotFolderId` (new) | Drive folder ID, optional | A folder the worker creates on first publish (allowed by `drive.file`); missing: create and store it |
| Script Properties | `categoryMapHash` (new, fallback only) | string, optional | Written only if the AC-16 fallback is switched on |
| Drive | snapshot file | JSON `TodaySnapshot`, named `today-<generatedAt>.json` | Lives in the snapshot folder. Immutable after creation. About 96 a day, permanently deleted after 1 hour unless current or previous |
| Gmail | `Newsletters` | thread label | Parent marker on every detected newsletter thread. The candidate search relies on this label existing on the thread itself, so it works whether or not Gmail's parent label search also matches sublabels (task 1 checks which) |
| Gmail | `Newsletters/<Category>`, `Newsletters/Unsorted` | thread labels | Created on first use with `GmailApp.createLabel` |
| Worker code | category map | `CategoryMap` constant | Canonical keys only; validated each run |
| Phone IndexedDB | `appToken` (new) | string | Via `idb-keyval`, key `appToken`. The only thing the phone stores in this slice |
| Vercel env | `APP_TOKEN`, `SCRIPT_URL`, `SCRIPT_KEY` | strings | From spec 0001; now read by `env.ts` |

Relationships: one pointer references one snapshot file, and one previous pointer references at most one other. A snapshot holds zero or more issues (spec 0002). One Gmail thread carries the parent label plus zero or more category sublabels. Labels belong to threads, not messages, so a thread that mixes a newsletter with other mail is labeled as a whole.

### One run, step by step

Mode is `timer` (processing budget 3 minutes, lock wait 10 seconds) or `refresh` (processing budget 12 seconds, lock wait 2 seconds). Budgets are measured from run start `t0`.

1. **Lock.** `LockService.getScriptLock().tryLock(wait)`. Timer: on failure, log `skipped_busy` and return. Refresh: on failure, serve the current snapshot (see `doGet`). Release in `finally`.
2. **Settings and map.** Decode properties. Validate `isScriptSettings`, `isCategoryMap`, and the label rules in AC-13. Any failure stops the run before any Gmail or Drive write.
3. **Plan.** `windowStart = (lastProcessedAt ?? t0 − 24h) − 15 min overlap` and `floor = t0 − 7 days`; `since = max(windowStart, floor)`. If `floor` won, log `gap_capped`. Search `after:<floor(since / 1000)> -in:trash -in:spam -in:sent` in pages of 100 threads until a page returns fewer than 100, 2000 threads are listed (log `listing_capped`), or the budget is spent. Refresh lists one page only. Collect every message in the listed threads with `getDate() > since`, sorted by date ascending, then by ID.
4. **Process**, in that order, until the processing budget (counted from `t0`, listing included) is spent. Read headers with `getHeader(name)` and trim them; never `getRawContent()`. If `List-Unsubscribe` is nonempty, parse `From` with `normalizeSenderEmail`. If it can't be parsed, skip the message and log `sender_unparseable` with no address. Otherwise resolve the category and add `Newsletters` plus `Newsletters/<Category>` to the thread, skipping any label it already has. Every message passed, skipped or not, counts as completed. Let `processedThrough` be the date of the last message completed. The new marker is `t0` if every planned message completed and the listing was not capped. If the listing was capped, it is the date of the oldest listed message. Otherwise it is `processedThrough`.
5. **Candidates.** Search `label:Newsletters newer_than:2d` (paged by 100), plus the threads labeled in step 4 (this covers search index lag). Then capture `generatedAt = Date.now()`. In refresh mode, if step 4 labeled nothing, stop here and serve the current snapshot.
6. **Assemble.** For each message in the candidate threads that is not in trash (`isInTrash()`), has a nonempty `List-Unsubscribe`, and has `generatedAt − 24h < receivedAt ≤ generatedAt`: build a `NewsletterIssue` per spec 0002. Apply step 4's skip rule for an unparseable `From`. Display name: the text before `<`, with surrounding quotes stripped and trimmed. If that is empty, use the address. Encoded words are not decoded. Unsorted items get `{ kind: "none" }`, and the body is never read. Mapped items get `getBody()` if it's nonempty, otherwise `getPlainBody()`. Deduplicate by message ID, sort, and validate with `isTodaySnapshot`. Serialize, log the byte size, and fail with `snapshot_too_large` if it is over 4MB (AC-15). A Gmail read failure or a whole snapshot validation failure aborts the run before publish.
7. **Publish** (spec 0002). Check the 5 minute hard stop first (`run_overbudget`). Through the Drive advanced service: `Drive.Files.create` in the folder, `Drive.Files.get` with `alt: "media"` to read it back, and validate. Then `setProperties({ snapshotFileId: new, previousSnapshotFileId: old })` in one call. If it throws, reread `snapshotFileId`: if it is the new file, publication succeeded; if it is the old one, it did not; anything else is unknown, so fail with no marker write and no cleanup.
8. **Marker.** After a confirmed publish, set `lastProcessedAt` to the new marker. A throw is logged, never rolled back.
9. **Relabel** in window threads (AC-4), after publish, so a label failure never blocks the snapshot. Compute each thread's desired set of `Newsletters/` labels and write only the difference. Failures are logged as `relabel_failed` and retried naturally by the next run.
10. **Cleanup.** If the pointer is readable, list the folder (`Drive.Files.list`, query on the folder as parent and not trashed) and permanently delete (`Drive.Files.remove`) files older than 1 hour except the current and previous files. Failures are logged and never undo anything.
11. **Log** one line: mode, outcome, processed count, candidate count, item count, snapshot bytes, duration in ms. No addresses, subjects, IDs, or URLs. Any outcome other than success or `skipped_busy` is thrown from `onTimer` after logging.

**Drive access.** All Drive calls go through the Drive advanced service (v3), switched on in `appsscript.json` under `dependencies.enabledAdvancedServices`. The OAuth scopes stay exactly as pinned (`drive.file`). `DriveApp` is not used, because its methods may demand the full Drive scope. If task 1's check shows the advanced service also fails under `drive.file`, stop and route back to `/architect`; never widen the scope silently.

**Snapshot folder.** On first publish, or when the stored folder is missing or trashed, create a folder named `Morning Feed snapshots` with the advanced service and store its ID in `snapshotFolderId`.

### State transitions

Web app shell state (`/` stays static; the state lives in the client):

`checking` (reading IndexedDB) → `setup` (no token) or `feed` (token found)
`setup` → `feed` when a token is saved (any test result other than 401)
`feed` → `setup` on a 401 (with the "stopped working" message) or on "Change secret key" (with Cancel back to `feed`)

Feed query states: `loading` (first fetch, no data) → `success` (rows or empty state) or `error`. On `error`, the banner shows above any data already loaded in this session.

### API surface

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Worker `doGet` (`/exec`) | GET | `key`: string (req), `refresh`: `"1"` (opt) | `TodaySnapshot` JSON | `key` equals `SCRIPT_KEY` (SHA-256 digests compared over every byte) | `bad_key` for a missing or wrong key; `internal` for an unreadable or invalid snapshot or bad settings |
| `/api/today` (`apps/web/src/app/api/today/route.ts`) | GET | `Authorization: Bearer` (req), `refresh=1` (opt, forwarded) | `TodaySnapshot` JSON, 200, `no-store` | Bearer equals `APP_TOKEN` (SHA-256 plus `timingSafeEqual`) | 401 with an empty body; 502 `{ ok: false, error: "internal" }` |
| `listNewsletterHeaders()` | editor run | none | log lines | your editor session | none (read only) |
| `onTimer()` | trigger | none | run log line | trigger as owner | logs the failure stage; Apps Script failure email |

`doGet` with `refresh=1`: take the lock (2 seconds). If it is acquired, run in `refresh` mode. Return the snapshot it published, or the current one if nothing new was labeled. If the lock is busy or the run fails (logged), return the current published snapshot. If none is readable, return `internal`. Any `refresh` value other than `1` is ignored.

The proxy fetches `SCRIPT_URL?key=…[&refresh=1]` with `redirect: "follow"`, `cache: "no-store"`, and a 25 second abort. It accepts only a JSON content type whose body parses and passes `isTodayResponse`. Any `ErrorEnvelope` from upstream becomes the 502 above. It logs a fixed stage name (`upstream_timeout`, `upstream_not_json`, `upstream_invalid`, `upstream_bad_key`, `upstream_internal`), never the URL.

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Process | `since` window start | `lastProcessedAt` (or `t0` − 24h), minus 15 min overlap, floored at `t0` − 7 days |
| Process | newsletter or not | Message `List-Unsubscribe` header, nonempty |
| Process, assemble | category | Category map constant: normalized `List-Id` in `listIds`, then normalized `From` address in `senders`, else `Unsorted` |
| Process | new marker | `t0` when all planned messages completed, else date of the last completed message |
| Assemble | `generatedAt` | Worker clock after candidate search |
| Assemble | `id`, `threadId`, `receivedAt`, `subject` | Gmail message ID, thread ID, `getDate()`, `getSubject()` |
| Assemble | `sender`, `senderEmail` | Parsed `From` display name (fallback: address) and `normalizeSenderEmail` |
| Assemble | `listId` | `normalizeListId(List-Id header)` or `null` |
| Assemble | `content` | Category plus `getBody()` / `getPlainBody()` (spec 0002 rule) |
| Assemble | `gmailUrl` | `https://mail.google.com/mail/u/0/#all/` plus thread ID |
| Relabel | desired sublabels per thread | Categories of the thread's in window newsletter messages |
| Publish | `snapshotFileId`, `previousSnapshotFileId` | New file ID; prior pointer value |
| Cleanup | file age | Drive API `createdTime` vs run clock |
| Assemble | snapshot bytes | Length of the serialized JSON |
| Setup | token to test and store | Pasted input, trimmed |
| Header helper | display name per pair | Most frequent parsed display name for that (List-Id, address) pair |
| `doGet` | which snapshot | `snapshotFileId` property read once, file opened by ID |
| Proxy | upstream URL and key | `env.scriptUrl`, `env.scriptKey` |
| Proxy | expected token | `env.appToken` |
| Phone | bearer token | IndexedDB `appToken` |
| Feed | masthead date | Phone clock and locale |
| Feed | "Updated <time>" | Snapshot `generatedAt`, formatted in the phone's timezone |
| Feed | visible items | Snapshot items with `receivedAt > now − 24h` by the phone clock (lower bound only, so a phone clock running behind never hides new mail) |
| Feed | row time | `receivedAt`, formatted by `IssueRow` |
| Feed | row link | `gmailUrl` for every item, `destination="gmail"` |
| Feed | row destination line | Item `category` compared with the contract's `UNSORTED`: equal gives "Unsorted · opens in Gmail", any other category gives "Opens in Gmail" (passed to `IssueRow` as `unsorted`); the accessible suffix is ", opens in Gmail" either way |
| Setup | error text | 401 from the token test or from the feed query |

### Web app details

- `apps/web/src/features/feed/` holds `domain/` (24 hour filter, response classification into success, unauthorized, or failed), `adapters/` (`/api/today` client and IndexedDB token store), and `ui/` (setup form, feed, masthead). The route file only wires the adapter. `src/app/page.tsx` renders a client root and stays static.
- Install `@tanstack/react-query` and `idb-keyval` at exact versions. There is no persister in this slice (offline belongs to slice 3). Query key `["today"]`, `staleTime` 0, `refetchOnWindowFocus` on (TanStack listens for `visibilitychange`, which fires when the home screen app returns to the foreground). Retry: never on 401, at most once otherwise, with `retryDelay` 2000 ms. A successful setup test writes its snapshot into the query with `setQueryData`. Row links use `IssueRow`'s `gmail` destination: `target="_blank" rel="noopener noreferrer"` (spec 0003 AC-4). On the installed iPhone app this opens a Safari sheet over the feed, and Done returns to it intact (seen once, on one iOS version, in the task 1 phone test on 2026-11-13; task 5 checks it again).
- Request persistent storage with `navigator.storage.persist()` on the first token save. If it is refused, nothing breaks.
- Copy and components come from `DESIGN.md`: `Banner` variant `stale` with a "Retry" action for load failures, `EmptyState` for the empty day, `StatusRegion` announcing "Loading today's newsletters" on the first load.
- `env.ts` gains `appToken`, `scriptUrl` (must be `https`), and `scriptKey`, all required. CI and the Playwright servers set dummy values. End to end tests intercept `/api/today` with `page.route` fixtures and never hit Apps Script.

### Key invariants

- The worker never archives, trashes, or deletes mail. It only adds or removes `Newsletters` sublabels on threads.
- An Unsorted message's body is never read, stored, or served.
- `lastProcessedAt` never moves past a message that was not fully processed, and never moves before a confirmed publish.
- The published pointer always references a file that was read back and validated.
- Only one run holds the script lock at a time; `doGet` reads without the lock (immutable files make this safe).
- Every proxy response is either a valid snapshot (200), a bare 401, or the 502 `internal` envelope. Google HTML never reaches the phone.
- `/` stays statically rendered; no cookies or headers reads.

### Security model

One owner. `APP_TOKEN` (phone) authorizes reading through the proxy. `SCRIPT_KEY` (server only) authorizes the proxy's call to `doGet`. Both are at least 32 random bytes, and both are compared in constant time (SHA-256 digests compared over every byte). The setup token test is the only extra request a stranger could make, and it gets the same bare 401 as any other bad request. Unsorted subjects and sender addresses are knowingly copied into Drive, responses, and memory on the phone (spec 0002). No new regulatory scope applies to this personal tool. Logs carry stage names and counts only.

### Configuration required

- `APP_TOKEN`, `SCRIPT_URL`, `SCRIPT_KEY` (Vercel, Production and Preview): already defined in spec 0001; this slice is the first to read them through `env.ts`.
- `SCRIPT_KEY` Script Property in Apps Script.
- Drive advanced service (v3) enabled in `apps/script/appsscript.json` (`dependencies.enabledAdvancedServices`); no new OAuth scope. The test that locks the scope list stays unchanged.
- In the Apps Script editor's Triggers page, set the failure notification for `onTimer` to "Notify me immediately". This is one manual step, added to `apps/script/README.md`.

### Critical test scenarios

- Happy path (Vitest, fake Gmail, Drive, and Properties facades): one mapped and one Unsorted message arrive, the run labels both, publishes a valid snapshot with HTML for the mapped item and `none` for the Unsorted one (whose body getter is never called), and moves the marker to `t0`. Verifies **AC-1**, **AC-3**, **AC-5**.
- Catch up: marker 3 days old, 250 messages, budget expires after message 120: the marker equals message 120's date, and the next run finishes the rest; a rerun adds no new labels. Verifies **AC-2**, **AC-6**.
- Relabel: a sender moves from Unsorted to `AI` in the map; the in window thread swaps the sublabels, an out of window thread is untouched, and the parent label stays. Verifies **AC-4**.
- Publish failures: the read back fails validation (pointer unchanged); the pointer write commits then throws (the reread confirms it, and the marker updates); the reread fails (no marker write, no cleanup); cleanup spares the current file, the previous file, and files under 1 hour old. Verifies **AC-5**.
- Lock: timer with the lock held skips; refresh with the lock held returns the current snapshot. Verifies **AC-6**, **AC-7**.
- `doGet` auth: missing key, wrong key, and a key of a different length all return `bad_key`; a corrupt pointed file returns `internal`. Verifies **AC-7**.
- Proxy (Vitest, stubbed `fetch`): wrong bearer gives 401 and upstream is never called; upstream HTML, `bad_key`, wrong version, and a 25 second abort each give 502 `internal`. Verifies **AC-8**.
- Setup and errors (Playwright WebKit iPhone, `page.route` fixtures, axe): no token shows setup; a 401 test shows the error and saves nothing; a 502 test saves and shows the feed with the banner; a 401 during the feed opens setup with the message; Change and Cancel keep the token. Verifies **AC-9**, **AC-11**.
- Feed: the fixture includes an item 25 hours old by the page clock, which is hidden; empty fixture shows the empty copy; every row's link equals `gmailUrl`. Verifies **AC-10**.
- Header helper and map: the helper's output has no subjects and makes no writes; an invalid map constant fails the run before any write. Verifies **AC-12**, **AC-13**.
- Size and duration: a fixture snapshot over 4MB fails with `snapshot_too_large` and publishes nothing; with the fallback switched on, an unchanged run under 60 minutes old skips the rebuild. Verifies **AC-15**, **AC-16**.
- Poison and edge mail: a candidate with an unparseable `From`, a trashed message, and a capped listing each behave as specified, and the run still publishes. Verifies **AC-2**, **AC-3**.
- Contract drift (carried from spec 0001 verify, D-6): once the worker assembles snapshots and the web app consumes them, temporarily change `NewsletterIssue.receivedAt` to `string`; `pnpm --filter script typecheck` and `pnpm --filter web typecheck` must both fail, then revert. Verifies **AC-3**, **AC-10**.
- Real phone: the AC-14 walk, recorded in `verify.md`. Verifies **AC-14**.

## Build plan

Tracer Bullet: the first task gets one real newsletter from Gmail to the installed iPhone app through every layer, as thin as possible. Each later task fills out one strand.

1. **Thin thread.** First, a check in the real script: enable the Drive advanced service, then prove that create folder, create file, read file, list folder, and delete work under the pinned scopes. Also run one `label:Newsletters` search on a hand labeled thread with only a sublabel, and record whether parent label search matches sublabels. Then the worker: a minimal `onTimer` that searches `newer_than:1d`, keeps messages with `List-Unsubscribe`, builds an all Unsorted snapshot, writes one Drive file, sets `snapshotFileId`, and logs its duration and byte size. `doGet` checks the key and serves it. Web: `env.ts` secrets, the `/api/today` proxy with the bearer check and 502 mapping, a setup state that stores the token in IndexedDB, and a feed of `IssueRow`s linking to Gmail. Release the worker, deploy Vercel, install on the iPhone, and see a real card. Satisfies **AC-5** (Drive check), **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-14** (thin), **AC-15**, **AC-16** (logging).
2. **Worker processing.** Tighten `isCategoryMap` in `packages/contract` with the label rules (spec 0002 invariant 7) and its tests, settings decoding, the `categoryMap.ts` constant plus validation, `listNewsletterHeaders` (new entry point) and seeding the map from its output, processing labels, oldest first catch up with marker rules, script lock, and both budgets. Then the row destination line (amends spec 0003 AC-4 and AC-10): export one `UNSORTED = "Unsorted"` constant from `packages/contract` (additive, no version bump) and use it in the contract validation, the worker, and the feed; type `IssueRow`'s props as a discriminated union, `{ destination: "reader"; unsorted?: never } | { destination: "gmail"; unsorted: boolean }`, locked by a `@ts-expect-error` test; the visible, `aria-hidden` line reads "Unsorted · opens in Gmail" when `unsorted` is true and "Opens in Gmail" when false, while the hidden accessible suffix stays ", opens in Gmail" for both; the feed passes `item.category === UNSORTED`; the gallery shows an Unsorted Gmail row and a mapped Gmail row, covered by the existing axe, large text, and 320px checks; assertions that hardcode "Unsorted" are updated, and the feed e2e gains one mapped and one Unsorted row; `DESIGN.md`'s Issue row rule changes to "Rows that open Gmail add a third line: 'Unsorted · opens in Gmail' or 'Opens in Gmail'". Satisfies **AC-1**, **AC-2**, **AC-6**, **AC-10**, **AC-12**, **AC-13**.
3. **Snapshot and publish.** Candidates from the label search merged with this run's labels, content rules and skip rules, the size guard, the full publish protocol with reconcile, `previousSnapshotFileId`, the snapshot folder and permanent cleanup, in window relabel, the 5 minute hard stop, throwing from `onTimer`, the `refresh=1` path in `doGet`, and the AC-16 fallback behind its constant (off by default). Satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-15**, **AC-16**.
4. **Phone states.** Token test on setup, the "Change secret key" link and Cancel, the 401 message, the load error banner with Retry and retry rules, the phone clock 24 hour filter, the masthead, refetch on foreground, `storage.persist()`, plus proxy and Playwright tests. Satisfies **AC-8**, **AC-9**, **AC-10**, **AC-11**.
5. **Real phone pass.** Set the trigger failure notification, run the AC-14 walk on the iPhone (including Done returning to the feed intact from a mapped and an Unsorted row), record the snapshot size, and check a day of run durations against the AC-16 threshold (switch the fallback on if it is crossed). Satisfies **AC-14**, **AC-16**.

## Consequences

**Positive**:
- The whole thread from Gmail to the phone is real and tested from the first slice; every later slice only thickens it.
- Outages heal themselves: catch up plus oldest first processing means no newsletter is stranded unlabeled.
- `generatedAt` doubles as a heartbeat, so slice 3's stale banner needs no new contract field.
- The label fix up logic built here is what slice 4 needs to decide what to archive.

**Negative / tradeoffs**:
- Each run reads every in window newsletter body again and writes a Drive file (about 96 a day). Daily runtime is not yet measured. AC-16 presets the fallback if runs get slow. If Apps Script reports "Service invoked too many times" even then, caching bodies by message ID would be a new decision.
- Drive goes through the advanced service rather than `DriveApp`, so the Drive code reads like the REST API, and fakes in tests mirror that shape.
- Until slice 3's stale banner, the "Updated <time>" in the masthead and Google's failure emails (which can arrive as a daily digest) are the only signs the worker stopped.
- The search covers all mail except trash, spam, and sent, so newsletters that skip the inbox are labeled too.
- Labels apply to whole threads, so a newsletter that lands in a thread with personal mail labels that thread too.
- If you remove the parent `Newsletters` label by hand, that issue drops out of the feed.
- A refresh whose rebuild runs past 25 seconds shows as a 502 on the phone while the worker still publishes. The next fetch picks it up.
- Building `refresh=1` before its UI exists means code that only `curl` and tests exercise until slice 3.
- In window relabeling adds Gmail writes on every run that a map change affects.
- An outage longer than 7 days, or more than 2000 inbox threads in the window, leaves the oldest missed newsletters unlabeled (logged, accepted).
- No offline yet: with no signal, the feed shows the error banner and no data until slice 3 adds the cache.

**Neutral**:
- Adds two dependencies to `apps/web` (`@tanstack/react-query`, `idb-keyval`), both already chosen in spec 0001.
- Adds two worker private Script Properties outside the `ScriptSettings` type; they stay worker internal and never cross the contract.
- `apps/script/README.md` gains the trigger notification step.

## Follow-up

- [x] Record during the phone pass where the Gmail link lands (design review concern R2-13). Recorded 2026-11-13: it lands on the Gmail web **inbox** with its count, not the thread; Done returns to the feed intact. The fallback is now owed in the reader spec (slice 2, scope feature 6). The link address decides the landing, not the tab. Scope feature 6 should carry this as an input; add it with `/scope`.
- [ ] Answer design doc open question 2 (do TLDR variants share a sender address?) from `listNewsletterHeaders` output, and note it in the map file.
- [ ] Watch the run log for a week: run duration and any quota errors. If either is close to a limit, revisit body caching.
- [ ] Slice 3 (offline & freshness) adds the TanStack persister, the pull gesture that calls `refresh=1`, and offline banners on top of this query; slice 4 reuses the relabel logic for archiving.
- [ ] `apps/script/AGENTS.md` should list the new `listNewsletterHeaders` entry point, the new Script Properties, and the rule "Drive through the advanced service, never `DriveApp`" once built (`/sync`).
- [x] Spec 0002 is amended by this spec (failed refresh serves the current snapshot; old snapshot files are permanently deleted, not trashed; category name label rules). Done 2026-11-13: 0002 and 0001 now carry the amendments and point here.
- [x] Record task 1's finding on parent label search in `rationale.md`. Done 2026-11-13: it does not match sublabels; no design change.
